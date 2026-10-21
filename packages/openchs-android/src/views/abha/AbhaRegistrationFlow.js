import _ from "lodash";
import {Alert, ToastAndroid} from "react-native";
import {getConnectionInfo} from "../../utility/ConnectionInfo";
import CHSNavigator from "../../utility/CHSNavigator";
import TypedTransition from "../../framework/routing/TypedTransition";
import AbhaService from "../../service/AbhaService";
import AbhaError from "../../service/AbhaError";
import IndividualService from "../../service/IndividualService";
import General from "../../utility/General";
import {Actions} from "../../action/individual/PersonRegisterActions";

// Eka's screens open on "Add Patient via ABHA" for both Create and Link, until Eka says whether they can open
// straight on its other routes (open decision "Eka's answers that ABDM M1 needs", question 5).
export const ABHA_SDK_METHOD = 'login_or_create_abha';
// The organisation's own consent wording, set in its translations. The platform's translations do not define it,
// so an organisation that sets none has no consent step.
// How long the card waits for the server to have the ABHA action before it opens anyway.
export const CARD_WAIT_MS = 5000;
export const ABHA_CONSENT_KEY = 'abhaRegistrationConsent';

// The ABHA step of a person's registration or edit (ABDM M1): Create and Link open Eka's screens, and the ABHA that
// comes back is checked against the organisation's patients before it fills anything in. The view supplies two
// dialogs: askAbhaConsent(text) resolves to the time the patient agreed, or null, and askAbhaReplace(rows) resolves
// true to apply the ABHA's details. Nothing here logs the ABHA number, address, Eka's IDs or the key.
class AbhaRegistrationFlow {
    constructor(view) {
        this.view = view;
        this.opening = false;
    }

    get I18n() {
        return this.view.I18n;
    }

    consentText() {
        const text = this.I18n.t(ABHA_CONSENT_KEY);
        return _.isString(text) && !_.isEmpty(_.trim(text)) && text !== ABHA_CONSENT_KEY ? text : null;
    }

    chooseWithout() {
        this.view.dispatchAction(Actions.ON_ABHA_CHOICE, {choice: 'without'});
    }

    toast(key) {
        ToastAndroid.show(this.I18n.t(key), ToastAndroid.LONG);
    }

    // route is the option the worker took, 'create' or 'link'. Checked in today (#2200) passes prefillAbhaAddress.
    async open({route, prefillAbhaAddress} = {}) {
        if (this.opening) return;
        this.opening = true;
        try {
            await this.openAbhaScreens(route, prefillAbhaAddress);
        } finally {
            this.opening = false;
        }
    }

    async openAbhaScreens(route, prefillAbhaAddress) {
        const {isConnected} = await getConnectionInfo();
        if (!isConnected) {
            Alert.alert(this.I18n.t('abhaTitle'), this.I18n.t('abhaNeedsInternet'), [
                {text: this.I18n.t('cancel'), style: 'cancel'},
                {text: this.I18n.t('abhaOptionWithout'), onPress: () => this.chooseWithout()},
            ]);
            return;
        }
        if (!this.view.state.abha.formHasConcepts) {
            this.toast('abhaFormNotSetUp');
            return;
        }
        let consentGivenAt = null;
        const consentText = this.consentText();
        if (consentText) {
            consentGivenAt = await this.view.askAbhaConsent(consentText);
            if (_.isNil(consentGivenAt)) {
                this.chooseWithout();
                return;
            }
        }
        let session;
        try {
            session = await this.view.getService(AbhaService).getSession(this.view.state.individual.subjectType.uuid);
        } catch (error) {
            General.logWarn('AbhaRegistrationFlow', `ABHA screens not opened: ${AbhaError.messageKey(error)}`);
            this.toast(AbhaError.messageKey(error));
            return;
        }
        CHSNavigator.navigateToAbhaView(this.view, session, {method: ABHA_SDK_METHOD, prefillAbhaAddress},
            (profile) => {
                TypedTransition.from(this.view).popToBookmark();
                return this.onProfile(profile, {route, consentGivenAt});
            },
            () => TypedTransition.from(this.view).popToBookmark());
    }

    // The registration screen this flow belongs to has closed. The store it fills is shared with whatever
    // registration is open now, so nothing more is filled in or shown after any wait.
    screenGone() {
        return !!this.view._isUnmounted;
    }

    async onProfile(profile, {route, consentGivenAt}) {
        const occurredAt = new Date();
        const {individual} = this.view.state;
        const abhaService = this.view.getService(AbhaService);
        const event = AbhaRegistrationFlow.auditEvent(profile, individual, consentGivenAt, occurredAt);
        if (profile.abhaNumber) {
            let holders;
            try {
                holders = await abhaService.findSubjectUUIDs(individual.subjectType.uuid, profile.abhaNumber);
            } catch (error) {
                General.logWarn('AbhaRegistrationFlow', `ABHA holders not found out: ${AbhaError.messageKey(error)}`);
                this.toast(AbhaError.messageKey(error));
                return;
            }
            if (this.screenGone()) return abhaService.recordEvent(event);
            const others = _.without(holders, individual.uuid);
            if (!_.isEmpty(others)) {
                this.showDuplicate(others);
                return;
            }
        }
        if (this.view.props.params.editing) {
            if (!(await this.view.askAbhaReplace(AbhaRegistrationFlow.replaceRows(individual, profile, this.I18n)))) return;
            if (this.screenGone()) return abhaService.recordEvent(event);
        }
        const recorded = abhaService.recordEvent(event);
        this.view.dispatchAction(Actions.ON_ABHA_PROFILE, {profile, choice: route, subjectUUID: individual.uuid});
        // Not awaited: the card is shown over the registration, which is already filled in and can be saved.
        this.showCardOnceRecorded(recorded, individual.uuid, profile.abhaNumber);
    }

    // The card is asked of the server, which has the ABHA action only once it is recorded, so the card waits for the
    // record, for at most CARD_WAIT_MS. After that it opens anyway and offers Try again. A worker who has left the
    // registration meanwhile is not shown it. Showing the card never creates or links an ABHA again.
    async showCardOnceRecorded(recorded, subjectUUID, abhaNumber) {
        let timer;
        const limit = new Promise((resolve) => { timer = setTimeout(resolve, CARD_WAIT_MS); });
        try {
            await Promise.race([Promise.resolve(recorded).catch(() => false), limit]);
        } finally {
            clearTimeout(timer);
        }
        if (this.screenGone()) return;
        CHSNavigator.navigateToAbhaCardView(this.view, {subjectUUID, abhaNumber});
    }

    // Another patient holds this ABHA. Only a live patient on this phone can be opened; of one elsewhere in the
    // organisation the worker learns nothing more.
    showDuplicate(subjectUUIDs) {
        const individualService = this.view.getService(IndividualService);
        const onPhone = _.find(_.map(subjectUUIDs, (uuid) => individualService.findByUUID(uuid)), (subject) => !_.isNil(subject) && !subject.voided);
        if (onPhone) {
            Alert.alert(this.I18n.t('abhaTitle'), this.I18n.t('abhaDuplicateOpen', {name: onPhone.nameString}), [
                {text: this.I18n.t('cancel'), style: 'cancel'},
                {text: this.I18n.t('abhaDuplicateOpenAction'), onPress: () => CHSNavigator.navigateToProgramEnrolmentDashboardView(this.view, onPhone.uuid)},
            ]);
        } else {
            Alert.alert(this.I18n.t('abhaTitle'), this.I18n.t('abhaDuplicateElsewhere'), [{text: this.I18n.t('ok')}]);
        }
    }

    static replaceRows(individual, profile, I18n) {
        const name = (...parts) => _.join(_.compact(_.map(parts, _.trim)), ' ');
        const gender = (genderName) => genderName ? I18n.t(genderName) : '';
        const date = (value) => value ? General.toDisplayDate(value) : '';
        return [
            {label: I18n.t('name'), current: name(individual.firstName, individual.middleName, individual.lastName), abha: name(profile.firstName, profile.middleName, profile.lastName)},
            {label: I18n.t('gender'), current: gender(_.get(individual, 'gender.name')), abha: gender(profile.genderName)},
            {label: I18n.t('dateOfBirth'), current: date(individual.dateOfBirth), abha: date(profile.dateOfBirth)},
        ];
    }

    // POST /abha/events. The server adds who sent it and their health centre.
    static auditEvent(profile, individual, consentGivenAt, occurredAt) {
        return {
            uuid: General.randomUUID(),
            subjectUUID: individual.uuid,
            subjectTypeUUID: individual.subjectType.uuid,
            action: profile.action,
            route: profile.route,
            abhaNumber: profile.abhaNumber,
            abhaAddress: profile.abhaAddress,
            ekaOid: profile.ekaOid,
            ekaTxnId: profile.ekaTxnId,
            consentGivenAt: consentGivenAt ? consentGivenAt.toISOString() : null,
            occurredAt: occurredAt.toISOString(),
        };
    }
}

export default AbhaRegistrationFlow;
