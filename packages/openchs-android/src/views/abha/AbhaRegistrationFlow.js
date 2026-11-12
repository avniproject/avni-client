import _ from "lodash";
import {Alert, ToastAndroid} from "react-native";
import {Individual} from "avni-models";
import {getConnectionInfo} from "../../utility/ConnectionInfo";
import CHSNavigator from "../../utility/CHSNavigator";
import TypedTransition from "../../framework/routing/TypedTransition";
import AbhaService from "../../service/AbhaService";
import AbhaError from "../../service/AbhaError";
import IndividualService from "../../service/IndividualService";
import EntityQueueService from "../../service/EntityQueueService";
import AbhaProfile, {ABHA_CONCEPT_NAMES} from "./AbhaProfile";
import General from "../../utility/General";
import {Actions} from "../../action/individual/PersonRegisterActions";

// Eka's screens open on "Add Patient via ABHA" for both Create and Link, until Eka says whether they can open
// straight on its other routes (open decision "Eka's answers that ABDM M1 needs", question 5).
export const ABHA_SDK_METHOD = 'login_or_create_abha';
// Verifying an ABHA a patient already has runs on Avni's own screens (AbhaVerifyView), which keep to the order NHA
// tests; Eka's screens stay for creating one. False puts both back on Eka's screens, as before 3 Nov 2026.
export const ABHA_NATIVE_VERIFY = true;
// The consent wording: the organisation's own, set in its translations, else the platform's, else the default the app
// carries (config/beforeSyncMessages.en.json), so every organisation with ABHA on asks for consent (NHA's CRT_ABHA_102).
// How long the card waits for the server to have the ABHA action before it opens anyway.
export const CARD_WAIT_MS = 5000;
export const ABHA_CONSENT_KEY = 'abhaRegistrationConsent';

// The ABHA step of a person's registration or edit (ABDM M1): Create and Link open Eka's screens, and the ABHA that
// comes back is checked against the organisation's patients before it fills anything in. The view supplies three
// dialogs: askAbhaConsent(text) resolves to the time the patient agreed, null when they do not agree, or undefined
// when closed without an answer; askAbhaReplace(rows) resolves true to apply the ABHA's details; and
// askAbhaDuplicate(name, rows) resolves true to open the patient who already holds the ABHA. Nothing here logs the ABHA number, address, Eka's IDs or the key.
class AbhaRegistrationFlow {
    constructor(view) {
        this.view = view;
        this.opening = false;
    }

    get I18n() {
        return this.view.I18n;
    }

    consentText() {
        return AbhaRegistrationFlow.consentTextOf(this.I18n);
    }

    // Also asked before the ABHA is verified again from its card.
    static consentTextOf(I18n) {
        const text = I18n.t(ABHA_CONSENT_KEY);
        return _.isString(text) && !_.isEmpty(_.trim(text)) && text !== ABHA_CONSENT_KEY ? text : null;
    }

    chooseWithout() {
        this.view.dispatchAction(Actions.ON_ABHA_CHOICE, {choice: 'without'});
    }

    toast(key) {
        ToastAndroid.show(this.I18n.t(key), ToastAndroid.LONG);
    }

    // Anything that goes wrong is said to the worker as "ABHA could not be completed". Only a fixed line is logged:
    // an error can quote the patient's details.
    failed(what) {
        General.logWarn('AbhaRegistrationFlow', what);
        this.toast('abhaError');
    }

    // route is the option the worker took: 'verify' (Avni's own screens), 'create' (Eka's), or 'findOrCreate' (Eka's,
    // when ABHA_NATIVE_VERIFY is off). Checked in today (#2200) passes prefillAbhaAddress. Never rejects: it runs from a button.
    async open({route, prefillAbhaAddress} = {}) {
        if (this.opening || _.get(this.view.state, 'abha.busy')) return;
        this.opening = true;
        try {
            await this.openAbhaScreens(route, prefillAbhaAddress);
        } catch (error) {
            this.failed('ABHA screens not opened');
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
            // Closed without an answer: nothing is chosen, and the options stay.
            if (_.isUndefined(consentGivenAt)) return;
            if (_.isNull(consentGivenAt)) {
                this.chooseWithout();
                return;
            }
        }
        const session = await this.session();
        if (!session || this.screenGone()) return;
        if (route === 'verify' && ABHA_NATIVE_VERIFY) {
            this.openVerifyScreens(session, consentGivenAt);
            return;
        }
        this.openEkaScreens(session, {route, consentGivenAt, prefillAbhaAddress});
    }

    // Eka's key for this phone and health centre, from Avni's server. Null after saying why it could not be had.
    async session() {
        try {
            return await this.view.getService(AbhaService).getSession(this.view.state.individual.subjectType.uuid);
        } catch (error) {
            General.logWarn('AbhaRegistrationFlow', `ABHA screens not opened: ${AbhaError.messageKey(error)}`);
            this.toast(AbhaError.messageKey(error));
            return null;
        }
    }

    openEkaScreens(session, {route, consentGivenAt, prefillAbhaAddress, abhaPrefill}) {
        CHSNavigator.navigateToAbhaView(this.view, session, {method: ABHA_SDK_METHOD, prefillAbhaAddress, abhaPrefill},
            (profile) => {
                TypedTransition.from(this.view).popToBookmark();
                return this.onProfile(profile, {route, consentGivenAt}).catch(() => this.failed('ABHA from Eka not filled in'));
            },
            () => TypedTransition.from(this.view).popToBookmark());
    }

    // The patient's consent covers the whole ABHA step, so creating an ABHA after "not found" does not ask again.
    openVerifyScreens(session, consentGivenAt) {
        CHSNavigator.navigateToAbhaVerifyView(this.view, session, {
            onProfile: (profile) => {
                TypedTransition.from(this.view).popToBookmark();
                return this.onProfile(profile, {route: 'verify', consentGivenAt}).catch(() => this.failed('ABHA verified, not filled in'));
            },
            onCreate: (aadhaar) => {
                TypedTransition.from(this.view).popToBookmark();
                this.view.runAfterSceneTransition(() => this.openCreateAfterNotFound(aadhaar, consentGivenAt)
                    .catch(() => this.failed('ABHA screens not opened for creation')));
            },
            onWithout: () => {
                TypedTransition.from(this.view).popToBookmark();
                this.chooseWithout();
            },
        });
    }

    // VRFY_ABHA_403: no ABHA was found, and the worker chose to create one. A new key is fetched, so Eka's screens get
    // their full time; the Aadhaar typed on the verify screens, when there was one, is carried over so it is not asked
    // for again. It goes only into the navigation to Eka's screen, whose log redacts it.
    async openCreateAfterNotFound(aadhaar, consentGivenAt) {
        if (this.screenGone()) return;
        const session = await this.session();
        if (!session || this.screenGone()) return;
        const abhaPrefill = _.isEmpty(aadhaar) ? undefined : {identifier: aadhaar, identifierType: 'aadhaar_number'};
        this.openEkaScreens(session, {route: 'create', consentGivenAt, abhaPrefill});
    }

    // The registration screen this flow belongs to has closed. The store it fills is shared with whatever
    // registration is open now, so nothing more is filled in or shown after any wait.
    screenGone() {
        return !!this.view._isUnmounted;
    }

    // Eka's screens have created or found the ABHA by now, so the action is recorded whatever happens next: the
    // record is kept on the phone before anything can fail, and sent once the outcome is settled, whether that is a
    // fill, another patient holding the ABHA, a cancel, a check that could not be done or a screen that closed.
    async onProfile(profile, {route, consentGivenAt}) {
        const occurredAt = new Date();
        const {individual} = this.view.state;
        const abhaService = this.view.getService(AbhaService);
        const event = AbhaRegistrationFlow.auditEvent(profile, individual, consentGivenAt, occurredAt);
        abhaService.keepEvent(event);
        this.setBusy(individual, true);
        let filled = false;
        let recorded;
        try {
            filled = await this.fillIn(profile, individual, route);
        } finally {
            this.setBusy(individual, false);
            // After the fill, so the form never waits on the network, and sent even when the fill failed.
            recorded = abhaService.recordEvent(event);
        }
        // Not awaited: the card is shown over the registration, which is already filled in and can be saved.
        if (filled) this.showCardOnceRecorded(recorded, individual, profile.abhaNumber, profile.abhaAddress);
    }

    // While busy the options are hidden and a progress indicator shows. Nothing is changed once the screen has closed.
    setBusy(individual, busy) {
        if (!this.screenGone()) this.view.dispatchAction(Actions.ON_ABHA_BUSY, {subjectUUID: individual.uuid, busy});
    }

    // Checks the ABHA against the organisation's patients and fills the form with it. True once filled; false when
    // another patient holds it, the worker cancelled or gave up, or the screen has closed.
    async fillIn(profile, individual, route) {
        if (profile.abhaNumber || profile.abhaAddress) {
            const holders = await this.holdersOf(individual, profile);
            if (_.isNil(holders) || this.screenGone()) return false;
            const others = _.without(holders, individual.uuid);
            if (!_.isEmpty(others)) {
                await this.showDuplicate(others, profile);
                return false;
            }
        }
        if (this.view.props.params.editing) {
            const apply = await this.view.askAbhaReplace(AbhaRegistrationFlow.replaceRows(individual, profile, this.I18n));
            if (!apply || this.screenGone()) return false;
        }
        this.view.dispatchAction(Actions.ON_ABHA_PROFILE, {profile, choice: route, subjectUUID: individual.uuid});
        return true;
    }

    // The card is asked of the server, which serves a patient it does not have yet only to the user who recorded
    // the ABHA action in the last 30 minutes. So the card waits for the record, for at most CARD_WAIT_MS, and when
    // the record has not reached the server it is sent once more, for at most as long again. After that the card
    // opens anyway and offers Try again. A worker who has left the registration meanwhile is not shown it. Showing
    // the card never creates or links an ABHA again.
    async showCardOnceRecorded(recorded, individual, abhaNumber, abhaAddress) {
        await AbhaRegistrationFlow.untilRecorded(recorded, this.view.getService(AbhaService), () => this.screenGone());
        if (this.screenGone()) return;
        // Eka's screen may still be sliding away: a push queued behind that pop reaches the navigator's focus
        // handler with no route. So the card waits until the registration screen's transition has settled.
        this.view.runAfterSceneTransition(() => {
            if (!this.screenGone()) CHSNavigator.navigateToAbhaCardView(this.view, {subjectUUID: individual.uuid, subjectTypeUUID: individual.subjectType.uuid, abhaNumber, abhaAddress});
        });
    }

    // Waits for the record to reach the server, for at most CARD_WAIT_MS, and sends it once more when it has not, for at
    // most as long again. Never rejects, whatever happened to the record.
    static async untilRecorded(recorded, abhaService, gone) {
        const landed = await AbhaRegistrationFlow.atMost(recorded, CARD_WAIT_MS);
        if (landed !== true && !gone()) {
            await AbhaRegistrationFlow.atMost(abhaService.resendUnsentEvents(), CARD_WAIT_MS);
        }
    }

    // What the promise gives, or undefined once ms have passed. Never rejects.
    static async atMost(promise, ms) {
        let timer;
        const limit = new Promise((resolve) => { timer = setTimeout(resolve, ms); });
        try {
            return await Promise.race([Promise.resolve(promise).catch(() => false), limit]);
        } finally {
            clearTimeout(timer);
        }
    }

    // The patients in the organisation who hold this ABHA number, and those on this phone not yet synced, whom the
    // server cannot know of. When the server cannot be asked, the worker can try again with the same ABHA rather than
    // take the patient through Eka's OTP again. Null when the worker gives up, or the screen has closed.
    async holdersOf(individual, profile) {
        for (;;) {
            try {
                const onServer = await this.view.getService(AbhaService).findSubjectUUIDs(individual.subjectType.uuid, profile.abhaNumber, profile.abhaAddress);
                return _.union(onServer, this.unsyncedHoldersOf(individual, profile));
            } catch (error) {
                const messageKey = AbhaError.messageKey(error);
                General.logWarn('AbhaRegistrationFlow', `ABHA holders not found out: ${messageKey}`);
                if (this.screenGone() || !(await this.askTryAgain(messageKey)) || this.screenGone()) return null;
            }
        }
    }

    // Only the queue of patients waiting to be synced is read, which is small; never every patient's answers. Numbers
    // are compared as digits; with no number, addresses by the part before '@' in any case, as the server does. The
    // patient being edited does not count.
    unsyncedHoldersOf(individual, profile) {
        const digits = AbhaProfile.digitsOnly(profile.abhaNumber);
        const addressName = (address) => _.toLower(_.head(_.split(_.trim(address), '@')));
        const name = _.isEmpty(digits) && profile.abhaAddress ? addressName(profile.abhaAddress) : null;
        const individualService = this.view.getService(IndividualService);
        return _.filter(this.view.getService(EntityQueueService).getQueuedEntityUUIDs(Individual.schema.name), (uuid) => {
            if (uuid === individual.uuid) return false;
            const subject = individualService.findByUUID(uuid);
            if (_.isNil(subject) || subject.voided) return false;
            if (!_.isEmpty(digits)) return AbhaProfile.digitsOnly(subject.getObservationValue(ABHA_CONCEPT_NAMES.abhaNumber)) === digits;
            const theirs = subject.getObservationValue(ABHA_CONCEPT_NAMES.abhaAddress);
            return !_.isEmpty(name) && !_.isEmpty(_.trim(theirs)) && addressName(theirs) === name;
        });
    }

    askTryAgain(messageKey) {
        return new Promise((resolve) => Alert.alert(this.I18n.t('abhaTitle'), this.I18n.t(messageKey), [
            {text: this.I18n.t('cancel'), style: 'cancel', onPress: () => resolve(false)},
            {text: this.I18n.t('abhaTryAgain'), onPress: () => resolve(true)},
        ], {cancelable: true, onDismiss: () => resolve(false)}));
    }

    // Another patient holds this ABHA. A live patient on this phone is shown beside the ABHA, name, gender, date of birth
    // and phone (NHA's M1 case VRFY_ABHA_308), and can be opened; of one elsewhere in the organisation the worker learns
    // nothing more.
    async showDuplicate(subjectUUIDs, profile) {
        const individualService = this.view.getService(IndividualService);
        const onPhone = _.find(_.map(subjectUUIDs, (uuid) => individualService.findByUUID(uuid)), (subject) => !_.isNil(subject) && !subject.voided);
        if (onPhone) {
            const open = await this.view.askAbhaDuplicate(onPhone.nameString, AbhaRegistrationFlow.duplicateRows(onPhone, profile, this.I18n));
            if (open && !this.screenGone()) CHSNavigator.navigateToProgramEnrolmentDashboardView(this.view, onPhone.uuid);
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

    static duplicateRows(individual, profile, I18n) {
        return [
            ...AbhaRegistrationFlow.replaceRows(individual, profile, I18n),
            {label: I18n.t('phone'), current: _.trim(individual.getMobileNumber()), abha: _.trim(profile.mobile)},
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
