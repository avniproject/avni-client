import React from "react";
import {ActivityIndicator, Button, PermissionsAndroid, SafeAreaView, ScrollView, Text, ToastAndroid, View} from "react-native";
import PropTypes from "prop-types";
import _ from "lodash";
import moment from "moment";
import RNFS from "react-native-fs";
import Share from "react-native-share";
import DeviceInfo from "react-native-device-info";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Path from "../../framework/routing/Path";
import TypedTransition from "../../framework/routing/TypedTransition";
import CHSContainer from "../common/CHSContainer";
import AppHeader from "../common/AppHeader";
import ExpandableImage from "../common/ExpandableImage";
import Colors from "../primitives/Colors";
import General from "../../utility/General";
import CHSNavigator from "../../utility/CHSNavigator";
import {getConnectionInfo} from "../../utility/ConnectionInfo";
import AbhaService from "../../service/AbhaService";
import AbhaError from "../../service/AbhaError";
import IndividualService from "../../service/IndividualService";
import AbhaProfile, {ABHA_CONCEPT_NAMES} from "./AbhaProfile";
import AbhaConsentDialog from "./AbhaConsentDialog";
import AbhaRegistrationFlow, {ABHA_SDK_METHOD} from "./AbhaRegistrationFlow";

// The audit record's action for an ABHA verified again from its card.
const ABHA_VERIFIED = 'verified';

// The patient's ABHA card: Download, Share and Close. The card is the ABHA number, name, photo and QR code, so the
// image the app fetched lives in the cache folder only while this screen is open and is deleted when it closes.
// The only copy that stays is one the worker chose to download. Nothing here logs the card, its path or the
// number. The ABHA is never created or linked again from here: a failed fetch offers Try again. Eka hands over the
// card only while the patient's ABHA login at Eka lasts, about 30 minutes after it; after that the card offers
// Verify ABHA instead, which takes the patient through Eka's screens once more.
@Path('/abhaCard')
class AbhaCardView extends AbstractComponent {
    static propTypes = {
        subjectUUID: PropTypes.string.isRequired,
        // For the key that opens Eka's screens when the ABHA is verified again.
        subjectTypeUUID: PropTypes.string,
        // The last four digits of the ABHA number, which name the downloaded file.
        abhaLastFour: PropTypes.string,
    };

    constructor(props, context) {
        super(props, context);
        this.state = {status: 'loading', path: null, errorKey: null, downloadedName: null, expired: false, consent: null};
        this.unmounted = false;
        this.verifying = false;
    }

    viewName() {
        return 'AbhaCardView';
    }

    onViewDidMount() {
        this.fetchCard();
    }

    async fetchCard() {
        this.setState({status: 'loading', errorKey: null, downloadedName: null, expired: false});
        let path;
        try {
            path = await this.getService(AbhaService).getCardFile(this.props.subjectUUID);
        } catch (error) {
            General.logWarn(this.viewName(), `ABHA card not fetched: ${AbhaError.messageKey(error)}`);
            if (!this.unmounted) this.setState({status: 'failed', errorKey: this.failureKey(error), expired: _.get(error, 'code') === 'ABHA_SESSION_EXPIRED'});
            return;
        }
        if (this.unmounted) {
            await AbhaService.deleteCardFile(path);
            return;
        }
        this.setState({status: 'ready', path});
    }

    // Verify ABHA: the organisation's consent, then Eka's screens, as at registration. Never rejects: it runs from a button.
    async verifyAgain() {
        if (this.verifying) return;
        this.verifying = true;
        try {
            await this.openAbhaScreens();
        } catch (error) {
            General.logWarn(this.viewName(), 'ABHA screens not opened to verify the ABHA again');
            ToastAndroid.show(this.I18n.t('abhaError'), ToastAndroid.LONG);
        } finally {
            this.verifying = false;
        }
    }

    async openAbhaScreens() {
        const {isConnected} = await getConnectionInfo();
        if (!isConnected) {
            ToastAndroid.show(this.I18n.t('abhaCardNeedsInternet'), ToastAndroid.LONG);
            return;
        }
        let consentGivenAt = null;
        const consentText = AbhaRegistrationFlow.consentTextOf(this.I18n);
        if (consentText) {
            consentGivenAt = await this.askConsent(consentText);
            // Not agreed, or closed without an answer: the card screen stays as it is.
            if (!consentGivenAt) return;
        }
        let session;
        try {
            session = await this.getService(AbhaService).getSession(this.props.subjectTypeUUID);
        } catch (error) {
            General.logWarn(this.viewName(), `ABHA screens not opened: ${AbhaError.messageKey(error)}`);
            ToastAndroid.show(this.I18n.t(AbhaError.messageKey(error)), ToastAndroid.LONG);
            return;
        }
        CHSNavigator.navigateToAbhaView(this, session, {method: ABHA_SDK_METHOD},
            (profile) => {
                TypedTransition.from(this).popToBookmark();
                return this.onVerified(profile, consentGivenAt).catch(() => {
                    General.logWarn(this.viewName(), 'ABHA verified again, card not shown');
                    ToastAndroid.show(this.I18n.t('abhaError'), ToastAndroid.LONG);
                });
            },
            () => TypedTransition.from(this).popToBookmark());
    }

    // Resolves to the time the patient agreed, null when they do not agree, or undefined when closed without an answer.
    askConsent(text) {
        return new Promise((resolve) => this.setState({consent: {text, resolve}}));
    }

    closeConsent(answer) {
        const {resolve} = this.state.consent;
        this.setState({consent: null});
        resolve(answer);
    }

    // Only the ABHA the patient already has is taken. Another one is not recorded against this patient: the latest
    // record names whose card the patient's profile shows, to everyone who may see it. The record reaches the server
    // before the card is asked for, as at registration.
    async onVerified(profile, consentGivenAt) {
        if (!AbhaCardView.isPatientsAbha(profile, this.patientsAbha())) {
            this.setState({errorKey: 'abhaCardDifferentAbha'});
            return;
        }
        const abhaService = this.getService(AbhaService);
        const {subjectUUID, subjectTypeUUID} = this.props;
        const event = AbhaRegistrationFlow.auditEvent({...profile, action: ABHA_VERIFIED}, {uuid: subjectUUID, subjectType: {uuid: subjectTypeUUID}},
            consentGivenAt, new Date());
        await AbhaRegistrationFlow.untilRecorded(abhaService.recordEvent(event), abhaService, () => this.unmounted);
        if (!this.unmounted) await this.fetchCard();
    }

    // The patient's ABHA as this phone holds it. A registration not saved yet is on no list, and has only the last four
    // digits the screen was opened with.
    patientsAbha() {
        const subject = this.getService(IndividualService).findByUUID(this.props.subjectUUID);
        return {
            digits: subject ? AbhaProfile.digitsOnly(subject.getObservationValue(ABHA_CONCEPT_NAMES.abhaNumber)) : null,
            address: subject ? subject.getObservationValue(ABHA_CONCEPT_NAMES.abhaAddress) : null,
            lastFour: this.props.abhaLastFour,
        };
    }

    // Compared as digits; by the last four when that is all there is; for a patient linked through the mobile route,
    // who has no number, by the ABHA address.
    static isPatientsAbha(profile, {digits, lastFour, address}) {
        const verified = AbhaProfile.digitsOnly(profile.abhaNumber);
        if (digits) return verified === digits;
        if (lastFour) return !_.isNil(verified) && verified.slice(-4) === lastFour;
        return !_.isEmpty(_.trim(address)) && _.toLower(_.trim(profile.abhaAddress)) === _.toLower(_.trim(address));
    }

    // A refusal the server named has its own message; everything else, including no network, is "could not be fetched".
    failureKey(error) {
        const key = AbhaError.messageKey(error);
        return key === 'abhaError' ? 'abhaCardFailed' : key;
    }

    componentWillUnmount() {
        this.unmounted = true;
        if (this.state.path) AbhaService.deleteCardFile(this.state.path);
        super.componentWillUnmount();
    }

    // Only these leave the registration or profile for this screen, never the whole number.
    static lastFour(abhaNumber) {
        const digits = AbhaProfile.digitsOnly(abhaNumber);
        return digits ? digits.slice(-4) : null;
    }

    // Named by the time of saving too, so a card never overwrites another patient's whose number ends the same way.
    static downloadFileName(abhaLastFour, at = new Date()) {
        return `${_.join(_.compact(['abha-card', abhaLastFour, moment(at).format('YYYYMMDD-HHmmss')]), '-')}.png`;
    }

    // Before Android 10 saving to the Downloads folder needs the storage permission; after it, none.
    async mayWriteDownloads() {
        const apiLevel = await DeviceInfo.getApiLevel();
        if (apiLevel >= General.STORAGE_PERMISSIONS_DEPRECATED_API_LEVEL) return true;
        const grant = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE);
        return grant === true || grant === PermissionsAndroid.RESULTS.GRANTED;
    }

    async download() {
        const fileName = AbhaCardView.downloadFileName(this.props.abhaLastFour);
        try {
            if (!(await this.mayWriteDownloads())) throw new Error('No permission to write to Downloads');
            await RNFS.copyFile(this.state.path, `${RNFS.DownloadDirectoryPath}/${fileName}`);
            this.setState({downloadedName: fileName});
        } catch (error) {
            // A fixed line: the error can carry the file's path.
            General.logWarn(this.viewName(), 'ABHA card not downloaded');
            ToastAndroid.show(this.I18n.t('abhaCardDownloadFailed'), ToastAndroid.LONG);
        }
    }

    async share() {
        try {
            await Share.open({url: `file://${this.state.path}`, type: 'image/png', failOnCancel: false});
        } catch (error) {
            // Closing the share sheet is not a failure.
            if (_.get(error, 'message') === 'User did not share') return;
            General.logWarn(this.viewName(), 'ABHA card not shared');
            ToastAndroid.show(this.I18n.t('abhaCardShareFailed'), ToastAndroid.LONG);
        }
    }

    renderBody() {
        const {status, path, errorKey, downloadedName, expired} = this.state;
        if (status === 'loading') return <ActivityIndicator testID="abhaCardLoading" size="large" color={Colors.ActionButtonColor} style={{marginTop: 48}}/>;
        if (status === 'failed') {
            return (
                <View style={{padding: 16}}>
                    <Text style={{color: Colors.ValidationError, marginBottom: 16}}>{this.I18n.t(errorKey)}</Text>
                    {expired
                        ? <Button title={this.I18n.t('abhaCardVerify')} color={Colors.ActionButtonColor} onPress={() => this.verifyAgain()}/>
                        : <Button title={this.I18n.t('abhaCardTryAgain')} color={Colors.ActionButtonColor} onPress={() => this.fetchCard()}/>}
                </View>
            );
        }
        return (
            <View style={{padding: 16}}>
                <ExpandableImage source={path} imageStyle={{width: '100%', aspectRatio: 1.6, resizeMode: 'contain'}}/>
                {downloadedName && <Text style={{marginTop: 12}}>{this.I18n.t('abhaCardDownloaded', {fileName: downloadedName})}</Text>}
                <View style={{marginTop: 16}}><Button title={this.I18n.t('abhaCardDownload')} color={Colors.ActionButtonColor} onPress={() => this.download()}/></View>
                <View style={{marginTop: 12}}><Button title={this.I18n.t('abhaCardShare')} color={Colors.ActionButtonColor} onPress={() => this.share()}/></View>
            </View>
        );
    }

    render() {
        return (
            <CHSContainer>
                <AppHeader title={this.I18n.t('abhaCardTitle')}/>
                <SafeAreaView style={{flex: 1}}>
                    <ScrollView>
                        {this.renderBody()}
                        <View style={{paddingHorizontal: 16, paddingBottom: 16}}>
                            <Button title={this.I18n.t('abhaCardClose')} color={Colors.ActionButtonColor} onPress={() => this.goBack()}/>
                        </View>
                    </ScrollView>
                </SafeAreaView>
                {this.state.consent &&
                <AbhaConsentDialog text={this.state.consent.text} onContinue={(agreedAt) => this.closeConsent(agreedAt)}
                                   onDecline={() => this.closeConsent(null)} onCancel={() => this.closeConsent(undefined)}/>}
            </CHSContainer>
        );
    }
}

export default AbhaCardView;
