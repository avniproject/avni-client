import React from "react";
import {ActivityIndicator, ScrollView, Text, TouchableNativeFeedback, View} from "react-native";
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

const TRANSLATED_ERRORS = ['key', 'stale', 'version', 'timeout', 'closed', 'hubNeedsAndroid10', 'badCode', 'joinFailed',
    'cannotReadNetwork', 'wrongNetwork', 'hubNotFound', 'joinInProgress', 'rejoinFailed', 'busy'];
// The phones-synced count and held uploads change without an event this screen hears.
const REFRESH_MS = 10 * 1000;
// Without a log, phones the hub refuses leave no trace.
const hubLog = (message) => General.logInfo('ClinicHub', message);

@Path('/clinicSharingView')
class ClinicSharingView extends AbstractComponent {
    constructor(props, context) {
        super(props, context);
        this.hub = context.getService('clinicHubService');
        this.spoke = context.getService('clinicSpokeService');
        this.state = {busy: false, scanning: false, error: null, permissionsDenied: false, savedJoinCode: null, held: null};
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
        const [savedJoinCode, held] = await Promise.all([this.spoke.savedJoinCode(), this.getService('clinicHoldBackService').getHeldUploads()]);
        if (!this._isUnmounted) this.setState({savedJoinCode, held});
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
    stopHub = () => this.run(() => this.hub.stopSharing());
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
        const code = _.get(error, 'code');
        if (_.includes(TRANSLATED_ERRORS, code)) return this.I18n.t(`clinicSharingError_${code}`, _.get(error, 'details', {}));
        return this.I18n.t('clinicSharingErrorOther', {message: _.get(error, 'message', '')});
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

    renderHub(sharing) {
        const refusal = this.getService('clinicMediaService').getHubStorageRefusal();
        return (
            <View>
                <ClinicHubQrCode qrValue={sharing.qrValue} ssid={sharing.ssid} passphrase={sharing.passphrase}
                                 networkLabel={this.I18n.t('clinicSharingNetworkName')} passwordLabel={this.I18n.t('clinicSharingNetworkPassword')}/>
                {this.renderText(this.I18n.t('clinicSharingPhonesSyncedRecently', {
                    count: this.hub.recentPhoneCount(), minutes: RECENT_PHONE_WINDOW_MS / 60000,
                }))}
                {this.hub.phonesSynced().map(({deviceId, name, syncedAt}) => (
                    <Text key={deviceId} style={{fontSize: Styles.normalTextSize, color: Colors.InputNormal, marginTop: 4}}>
                        {this.I18n.t('clinicSharingPhoneLastSynced', {phone: name, time: moment(syncedAt).format('LT')})}
                    </Text>
                ))}
                {refusal && this.renderText(this.I18n.t('clinicSharingHubLowStorage', {freeMb: refusal.freeMb}), {warning: true})}
                {this.renderButton(this.I18n.t('clinicSharingStopHub'), this.stopHub, false)}
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
        return (
            <View>
                {this.spoke.hubRestarted && this.renderText(this.I18n.t('clinicSharingHubRestarted'), {warning: true})}
                {this.spoke.hubNetworkLost && savedHub && this.renderText(this.I18n.t('clinicSharingHubNetworkLost', {hub: savedHub}), {warning: true})}
                {this.renderText(this.I18n.t('clinicSharingJoinTitle'), {title: true})}
                {savedHub && this.renderButton(this.I18n.t('clinicSharingRejoin', {hub: savedHub}), this.rejoin)}
                {this.renderButton(this.I18n.t(savedHub ? 'clinicSharingScanNewCode' : 'clinicSharingScanToJoin'), this.scan, !savedHub)}
                {canBeHub && this.renderText(this.I18n.t('clinicSharingHubTitle'), {title: true})}
                {canBeHub && this.renderText(this.I18n.t('clinicSharingStartHubHelp'))}
                {canBeHub && this.renderButton(this.I18n.t('clinicSharingStartHub'), this.startHub)}
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
                            {sharing ? this.renderHub(sharing) : joined ? this.renderJoined(joined) : this.renderNotJoined(canBeHub)}
                            {this.renderHeldUploads()}
                            {this.state.busy && <ActivityIndicator style={{marginTop: 16}}/>}
                        </View>
                    </ScrollView>
                </CHSContent>
            </CHSContainer>
        );
    }
}

export default ClinicSharingView;
