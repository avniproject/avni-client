import React from "react";
import {ActivityIndicator, Alert, ScrollView, Text, TouchableNativeFeedback, View} from "react-native";
import _ from "lodash";
import moment from "moment";
import {Individual} from "openchs-models";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Path from "../../framework/routing/Path";
import CHSContainer from "../common/CHSContainer";
import CHSContent from "../common/CHSContent";
import AppHeader from "../common/AppHeader";
import Styles from "../primitives/Styles";
import Colors from "../primitives/Colors";
import Distances from "../primitives/Distances";
import General from "../../utility/General";
import PrivilegeService from "../../service/PrivilegeService";
import EntityService from "../../service/EntityService";
import {RECENT_PHONE_WINDOW_MS} from "../../service/clinicsharing/ClinicHubService";
import {canStartHub} from "../../framework/clinicsharing/ClinicHubWifi";
import {ClinicRole, requestClinicHubPermissions} from "../../framework/clinicsharing/ClinicHubPermissions";
import {parseJoinPayload} from "../../framework/clinicsharing/ClinicJoinPayload";
import {HELD_UPLOAD_WARNING_DAYS} from "../../framework/clinicsharing/ClinicSharingConstants";
import ClinicHubQrCode from "./ClinicHubQrCode";
import ClinicHubScanner from "./ClinicHubScanner";
import {clinicSharingErrorText, hubLog} from "./ClinicSharingMessages";

// The phones-synced count and held uploads change without an event this screen hears.
const REFRESH_MS = 10 * 1000;

@Path('/clinicSharingView')
class ClinicSharingView extends AbstractComponent {
    constructor(props, context) {
        super(props, context);
        this.hub = context.getService('clinicHubService');
        this.spoke = context.getService('clinicSpokeService');
        this.state = {busy: false, scanning: false, error: null, permissionsDenied: false, savedJoinCode: null, held: null, hubCamp: false, phoneCamp: null};
    }

    viewName() {
        return 'ClinicSharingView';
    }

    onViewDidMount() {
        this.stopListening = [this.hub.onChange(() => this.refresh()), this.spoke.onChange(() => this.refresh())];
        this.refreshTimer = setInterval(() => this.refresh(), REFRESH_MS);
        this.refresh();
    }

    componentWillUnmount() {
        (this.stopListening || []).forEach((stop) => stop());
        clearInterval(this.refreshTimer);
        super.componentWillUnmount();
    }

    async refresh() {
        const [savedJoinCode, held, hubCamp, phoneCamp] = await Promise.all([this.spoke.savedJoinCode(),
            this.getService('clinicHoldBackService').getHeldUploads(), this.hub.campActive(), this.spoke.camp()]);
        if (!this._isUnmounted) this.setState({savedJoinCode, held, hubCamp, phoneCamp});
    }

    async run(work) {
        this.setState({busy: true, error: null});
        try {
            await work();
        } catch (error) {
            General.logError('ClinicSharingView', error);
            if (!this._isUnmounted) this.setState({error});
        } finally {
            if (!this._isUnmounted) this.setState({busy: false});
            this.refresh();
        }
    }

    async withPermissions(role, work) {
        const {granted} = await requestClinicHubPermissions(role);
        this.setState({permissionsDenied: !granted});
        if (granted) await work();
    }

    startHub = () => this.run(() => this.withPermissions(ClinicRole.hub, () => this.hub.startSharing(hubLog)));
    endCamp = () => this.run(() => this.hub.endCamp());
    skipPhone = (deviceId) => this.run(() => this.hub.skipPhone(deviceId));
    closeHub = () => this.run(() => this.hub.closeCamp());
    // Phones still in the camp are not told, so each has to leave it by hand.
    closeCampWithoutHub = () => Alert.alert(this.I18n.t('clinicSharingCloseCamp'), this.I18n.t('clinicSharingCloseCampConfirm'), [
        {text: this.I18n.t('clinicSharingCancel'), style: 'cancel'},
        {text: this.I18n.t('clinicSharingCloseCamp'), onPress: () => this.run(() => this.hub.closeCamp())},
    ]);
    scan = () => this.run(() => this.withPermissions(ClinicRole.phone, async () => this.setState({scanning: true})));
    cancelScan = () => this.setState({scanning: false});
    // A restarted hub has a new network, and the old one failing to appear looks the same as being out of range.
    rejoin = () => this.run(() => this.withPermissions(ClinicRole.phone, async () => {
        try {
            await this.spoke.joinWithCode(this.state.savedJoinCode);
        } catch (error) {
            if (!_.includes(['joinFailed', 'hubNotFound'], _.get(error, 'code'))) throw error;
            const rejoinFailed = new Error(error.message);
            rejoinFailed.code = 'rejoinFailed';
            rejoinFailed.details = {hub: _.get(parseJoinPayload(this.state.savedJoinCode), 'payload.ssid')};
            throw rejoinFailed;
        }
    }));
    syncNow = () => this.run(() => this.spoke.syncNow());
    leave = () => this.run(() => this.spoke.leaveHub());

    onScanned = (parsed, qrText) => {
        if (!this.state.scanning) return;
        this.setState({scanning: false});
        this.run(() => this.spoke.joinWithCode(qrText));
    };

    errorText(error) {
        return clinicSharingErrorText(this.I18n, error);
    }

    renderButton(label, onPress, primary = true) {
        return (
            <TouchableNativeFeedback onPress={onPress} disabled={this.state.busy}>
                <View style={[primary ? Styles.basicPrimaryButtonView : Styles.basicSecondaryButtonView, {marginTop: 8, minHeight: 44}]}>
                    <Text style={{color: primary ? Colors.TextOnPrimaryColor : Colors.InputNormal, fontSize: Styles.normalTextSize}}>{label}</Text>
                </View>
            </TouchableNativeFeedback>
        );
    }

    renderText(text, {warning = false, title = false} = {}) {
        return <Text style={{
            fontSize: title ? Styles.titleSize : Styles.normalTextSize,
            color: warning ? Colors.ValidationError : Colors.InputNormal,
            marginTop: title ? 16 : 8,
        }}>{text}</Text>;
    }

    renderPhoneLine({deviceId, name, syncedAt, leftAt, skipped}) {
        const time = moment(syncedAt).format('LT');
        const text = !this.hub.campEnding ? this.I18n.t('clinicSharingPhoneLastSynced', {phone: name, time})
            : leftAt ? this.I18n.t('clinicSharingPhoneLeft', {phone: name})
                : skipped ? this.I18n.t('clinicSharingPhoneSkipped', {phone: name})
                    : this.I18n.t('clinicSharingPhoneNotLeft', {phone: name, time});
        return (
            <View key={deviceId}>
                <Text style={{fontSize: Styles.normalTextSize, color: Colors.InputNormal, marginTop: 4}}>{text}</Text>
                {this.hub.campEnding && !leftAt && !skipped && this.renderButton(this.I18n.t('clinicSharingSkipPhone', {phone: name}), () => this.skipPhone(deviceId), false)}
            </View>
        );
    }

    renderHub(sharing) {
        const refusal = this.getService('clinicMediaService').getHubStorageRefusal();
        const ending = this.hub.campEnding;
        return (
            <View>
                {ending && this.renderText(this.I18n.t('clinicSharingCampEnding'), {title: true})}
                <ClinicHubQrCode qrValue={sharing.qrValue} ssid={sharing.ssid} passphrase={sharing.passphrase}
                                 networkLabel={this.I18n.t('clinicSharingNetworkName')} passwordLabel={this.I18n.t('clinicSharingNetworkPassword')}/>
                {this.renderText(this.I18n.t('clinicSharingPhonesSyncedRecently', {
                    count: this.hub.recentPhoneCount(), minutes: RECENT_PHONE_WINDOW_MS / 60000,
                }))}
                {this.hub.phonesSynced().map((phone) => this.renderPhoneLine(phone))}
                {refusal && this.renderText(this.I18n.t('clinicSharingHubLowStorage', {freeMb: refusal.freeMb}), {warning: true})}
                {!ending && this.renderText(this.I18n.t('clinicSharingEndCampHelp'))}
                {!ending && this.renderButton(this.I18n.t('clinicSharingEndCamp'), this.endCamp, false)}
                {ending && this.renderText(this.I18n.t('clinicSharingCloseHubHelp'))}
                {ending && this.hub.everyPhoneLeft() && this.renderButton(this.I18n.t('clinicSharingCloseHub'), this.closeHub)}
            </View>
        );
    }

    // The hub phone's camp outlives its hotspot, so it can carry on or close the camp.
    renderHubCampPaused() {
        return (
            <View>
                {this.hub.hotspotStopped && this.renderText(this.I18n.t('clinicSharingHubWifiStopped'), {warning: true})}
                {this.renderText(this.I18n.t('clinicSharingHubCampPaused'))}
                {this.renderButton(this.I18n.t('clinicSharingStartHub'), this.startHub)}
                {this.renderButton(this.I18n.t('clinicSharingCloseCamp'), this.closeCampWithoutHub, false)}
            </View>
        );
    }

    renderJoined(joined) {
        const {lastSync, lastSyncedAt} = this.spoke;
        return (
            <View>
                {this.renderText(this.I18n.t('clinicSharingJoinedTo', {hub: joined.ssid}), {title: true})}
                {this.renderText(lastSyncedAt
                    ? this.I18n.t('clinicSharingLastSynced', {time: moment(lastSyncedAt).format('LT')})
                    : this.I18n.t('clinicSharingNotSyncedYet'))}
                {lastSync && lastSync.error && this.renderText(this.errorText(lastSync.error), {warning: true})}
                {this.renderText(this.I18n.t('clinicSharingInCamp'))}
                {this.renderButton(this.I18n.t('clinicSharingSyncWithHub'), this.syncNow)}
                {this.renderButton(this.I18n.t('clinicSharingLeaveHub'), this.leave, false)}
            </View>
        );
    }

    renderNotJoined(canBeHub) {
        if (this.state.scanning) {
            return (
                <View>
                    {this.renderText(this.I18n.t('clinicSharingScanHelp'))}
                    <ClinicHubScanner onScanned={this.onScanned} isActive={this.state.scanning} style={{marginTop: 8}}/>
                    {this.renderButton(this.I18n.t('clinicSharingCancel'), this.cancelScan, false)}
                </View>
            );
        }
        const savedHub = this.state.savedJoinCode && _.get(parseJoinPayload(this.state.savedJoinCode), 'payload.ssid');
        const inCamp = !_.isNil(this.state.phoneCamp);
        const leftCamp = this.spoke.leftCamp;
        return (
            <View>
                {!inCamp && leftCamp && this.renderText(leftCamp.code === 'campEnded' ? this.I18n.t('clinicSharingCampEndedByHub') : this.errorText(leftCamp), {warning: leftCamp.code !== 'campEnded'})}
                {this.spoke.hubRestarted && this.renderText(this.I18n.t('clinicSharingHubRestarted'), {warning: true})}
                {this.spoke.hubNetworkLost && savedHub && this.renderText(this.I18n.t('clinicSharingHubNetworkLost', {hub: savedHub}), {warning: true})}
                {this.renderText(this.I18n.t('clinicSharingJoinTitle'), {title: true})}
                {inCamp && this.renderText(this.I18n.t('clinicSharingInCamp'))}
                {savedHub && this.renderButton(this.I18n.t('clinicSharingRejoin', {hub: savedHub}), this.rejoin)}
                {this.renderButton(this.I18n.t(inCamp ? 'clinicSharingScanNewCode' : 'clinicSharingScanToJoin'), this.scan, !inCamp)}
                {inCamp && this.renderButton(this.I18n.t('clinicSharingLeaveHub'), this.leave, false)}
                {canBeHub && !inCamp && this.renderText(this.I18n.t('clinicSharingHubTitle'), {title: true})}
                {canBeHub && !inCamp && this.renderText(this.I18n.t('clinicSharingStartHubHelp'))}
                {canBeHub && !inCamp && this.renderButton(this.I18n.t('clinicSharingStartHub'), this.startHub)}
            </View>
        );
    }

    _waitedOnName(uuid) {
        const individual = this.getService(EntityService).findByKey('uuid', uuid, Individual.schema.name);
        return individual ? individual.nameString : uuid;
    }

    renderHeldUploads() {
        const held = this.state.held;
        if (!held || held.count === 0) return null;
        const longWaiting = held.oldest && moment().diff(moment(held.oldest), 'days') >= HELD_UPLOAD_WARNING_DAYS;
        const waitedOn = longWaiting ? _.uniq(held.items.map(({waitingOn}) => this._waitedOnName(waitingOn))) : [];
        return (
            <View>
                {this.renderText(this.I18n.t('clinicSharingHeldUploads', {count: held.count}), {title: true})}
                {longWaiting && this.renderText(this.I18n.t('clinicSharingHeldUploadsWaitingOn', {days: HELD_UPLOAD_WARNING_DAYS, records: waitedOn.join(', ')}), {warning: true})}
            </View>
        );
    }

    render() {
        const sharing = this.hub.getSharing();
        const joined = this.spoke.joined;
        const canBeHub = this.getService(PrivilegeService).hasAllPrivileges() && canStartHub();
        return (
            <CHSContainer>
                <CHSContent>
                    <AppHeader title={this.I18n.t('clinicSharing')}/>
                    <ScrollView>
                        <View style={{paddingHorizontal: Distances.ContentDistanceFromEdge, paddingBottom: 24}}>
                            {this.state.permissionsDenied && this.renderText(this.I18n.t('clinicSharingPermissionsNeeded'), {warning: true})}
                            {this.state.error && this.renderText(this.errorText(this.state.error), {warning: true})}
                            {sharing ? this.renderHub(sharing) : this.hub.isStarting() ? this.renderText(this.I18n.t('clinicSharingHubStarting'))
                                : this.state.hubCamp ? this.renderHubCampPaused()
                                : joined ? this.renderJoined(joined) : this.renderNotJoined(canBeHub)}
                            {this.renderHeldUploads()}
                            {(this.state.busy || this.hub.isStarting()) && <ActivityIndicator style={{marginTop: 16}}/>}
                        </View>
                    </ScrollView>
                </CHSContent>
            </CHSContainer>
        );
    }
}

export default ClinicSharingView;
