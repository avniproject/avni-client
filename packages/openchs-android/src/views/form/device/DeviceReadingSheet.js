import PropTypes from "prop-types";
import React from "react";
import {ActivityIndicator, Animated, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View} from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import _ from "lodash";
import Colors from "../../primitives/Colors";
import Styles from "../../primitives/Styles";
import * as AnuPath from "../../../utility/anupath/AnuPathDevice";
import {analyticsTestKey} from "../../../utility/anupath/AnuPathFields";
import {logMedicalDeviceChanged, logMedicalDeviceConnection, logMedicalDeviceReading} from "../../../utility/Analytics";

const MEDICAL_DEVICE_TYPE = "anupath";

const STEP = {
    CHECKING: "checking",
    UNAVAILABLE: "unavailable",
    PERMISSION_DENIED: "permissionDenied",
    BLUETOOTH_OFF: "bluetoothOff",
    SELECT: "select",
    CONNECTING: "connecting",
    READING: "reading",
    PREVIEW: "preview",
    NOT_FOUND: "notFound",
    ERROR: "error"
};

// Bluetooth icon: grey until connected, pulsing while connecting, theme colour once connected, red on failure.
const BT = {OFF: "off", IDLE: "idle", CONNECTING: "connecting", CONNECTED: "connected", FAILED: "failed"};

// The box with the meter's own details (model, device ID, firmware, software, manufacturer) shown on
// the sheet once connected. Hidden at the PM's request; set to true to show it again. The details
// are still read from the meter and written to the form's "Device details" question.
const SHOW_DEVICE_INFO = false;

class BluetoothStatusIcon extends React.Component {
    static propTypes = {status: PropTypes.string.isRequired};

    constructor(props) {
        super(props);
        this.opacity = new Animated.Value(1);
    }

    componentDidMount() {
        this.syncPulse();
    }

    componentDidUpdate(prevProps) {
        if (prevProps.status !== this.props.status) this.syncPulse();
    }

    componentWillUnmount() {
        if (this.pulse) this.pulse.stop();
    }

    syncPulse() {
        if (this.pulse) this.pulse.stop();
        this.opacity.setValue(1);
        if (this.props.status !== BT.CONNECTING) return;
        this.pulse = Animated.loop(Animated.sequence([
            Animated.timing(this.opacity, {toValue: 0.3, duration: 600, useNativeDriver: true}),
            Animated.timing(this.opacity, {toValue: 1, duration: 600, useNativeDriver: true})
        ]));
        this.pulse.start();
    }

    render() {
        const {status} = this.props;
        const name = status === BT.CONNECTED ? "bluetooth-connect" : (status === BT.OFF || status === BT.FAILED ? "bluetooth-off" : "bluetooth");
        const color = status === BT.CONNECTED ? Colors.BrandPrimaryDark : (status === BT.FAILED ? Colors.ValidationError : Colors.TextHint);
        return (
            <Animated.View style={[styles.btIcon, {borderColor: color, opacity: this.opacity}]}>
                <Icon name={name} size={26} color={color}/>
            </Animated.View>
        );
    }
}

/**
 * Bottom sheet that gets the newest recent result of one test type from the worker's anuPath meter.
 * First use: Bluetooth permission -> turn Bluetooth on -> pick the meter from the list, nearest marked (remembered).
 * Later: connect to the remembered meter -> read -> preview -> "Accept".
 */
class DeviceReadingSheet extends React.Component {
    static propTypes = {
        visible: PropTypes.bool.isRequired,
        testName: PropTypes.string.isRequired,
        I18n: PropTypes.object.isRequired,
        onUse: PropTypes.func.isRequired,
        onClose: PropTypes.func.isRequired
    };

    constructor(props) {
        super(props);
        this.state = this.initialState();
        this.subscriptions = [];
        this.scanSubscriptions = []; // replaced on every new search, so listeners never pile up
        this.deviceInfo = null;
        this.meter = null;
        this.session = 0;               // bumped on every open, so a late reply from an earlier opening is not logged as this one
        this.resetAnalytics();
    }

    // ---- analytics (see Analytics.js "medical devices"); no health values are sent ----
    resetAnalytics() {
        this.openedAt = Date.now();
        this.attemptStartedAt = this.openedAt;
        this.remembered = false;
        this.accepted = false;
        this.lastError = null;          // {code, stage: "connect" | "read"} of the error on screen
        this.noRecords = false;
        this.previousMeterId = null;    // set by "Choose a different meter"
    }

    testKey() {
        return analyticsTestKey(this.props.testName);
    }

    logConnection(outcome, extra) {
        logMedicalDeviceConnection({
            medicalDeviceType: MEDICAL_DEVICE_TYPE,
            test: this.testKey(),
            outcome,
            durationMs: Date.now() - this.attemptStartedAt,
            remembered: this.remembered,
            ...extra
        });
    }

    logConnectionFailed(failureReason) {
        this.logConnection("failed", {failureReason, deviceId: _.get(this.meter, "address")});
    }

    readingOutcome() {
        if (this.accepted) return "accepted";
        const {step, record} = this.state;
        if (step === STEP.PREVIEW) return _.isNil(AnuPath.numericValue(record)) ? "invalid_value" : "cancelled";
        if (step === STEP.NOT_FOUND) return this.noRecords ? "no_records" : "not_found";
        if (step === STEP.ERROR && _.get(this.lastError, "stage") === "read") {
            const code = _.get(this.lastError, "code");
            return code === "INCOMPLETE_RECORD" ? "incomplete_record" : (code === "RECORD_MISMATCH" ? "record_mismatch" : "error");
        }
        if (step === STEP.READING) return "cancelled";
        // Closed with no meter connected: permission, Bluetooth off, choosing / connecting to a meter, connection error.
        return "not_connected";
    }

    logReading() {
        const record = this.state.record;
        logMedicalDeviceReading({
            medicalDeviceType: MEDICAL_DEVICE_TYPE,
            test: this.testKey(),
            outcome: this.readingOutcome(),
            recordAgeMinutes: record ? AnuPath.recordAgeMinutes(record) : null,
            unit: record ? record.unit : null,
            deviceId: _.get(this.meter, "address"),
            durationMs: Date.now() - this.openedAt
        });
    }

    initialState() {
        return {step: STEP.CHECKING, bt: BT.IDLE, message: null, devices: [], scanning: false, record: null, newest: null, deviceInfo: null, permissionBlocked: false};
    }

    t(key, params) {
        return this.props.I18n.t(key, params);
    }

    // "Tested on 26-10-2026 at 12:33" (translatable).
    testedOn(dateTime) {
        const {date, time} = AnuPath.splitTestedAt(dateTime);
        return time ? this.t("Tested on {{date}} at {{time}}", {date, time}) : this.t("Tested on {{date}}", {date});
    }

    componentDidMount() {
        if (this.props.visible) this.open();
    }

    componentDidUpdate(prevProps) {
        if (this.props.visible && !prevProps.visible) this.open();
        if (!this.props.visible && prevProps.visible) this.cleanup();
    }

    componentWillUnmount() {
        this.cleanup();
    }

    safeSetState(state) {
        if (this.active) this.setState(state);
    }

    open() {
        this.active = true;
        this.session += 1;
        this.deviceInfo = null;
        this.meter = null;
        this.resetAnalytics();
        this.setState(this.initialState());
        this.subscriptions.push(AnuPath.onConnectionState((event) => this.onConnectionState(event)));
        this.subscriptions.push(AnuPath.onRecordPushed((record) => this.onRecordPushed(record)));
        this.start();
    }

    cleanup() {
        if (this.active) this.logReading();
        this.active = false;
        clearInterval(this.bluetoothPoll);
        this.subscriptions.forEach((s) => s.remove());
        this.subscriptions = [];
        this.removeScanSubscriptions();
        if (AnuPath.isAvailable()) {
            AnuPath.stopScan().catch(_.noop);
            AnuPath.disconnect().catch(_.noop);
        }
    }

    close() {
        this.cleanup();
        this.props.onClose();
    }

    async start() {
        this.attemptStartedAt = Date.now();
        this.lastError = null;
        try {
            if (!AnuPath.isAvailable() || !(await AnuPath.isSupported())) {
                this.logConnectionFailed("ble_not_supported");
                return this.safeSetState({step: STEP.UNAVAILABLE});
            }
            const permission = await AnuPath.ensurePermissions();
            if (!permission.granted) {
                this.logConnectionFailed(permission.blocked ? "permission_blocked" : "permission_denied");
                return this.safeSetState({step: STEP.PERMISSION_DENIED, bt: BT.OFF, permissionBlocked: permission.blocked});
            }
            if (!(await AnuPath.isBluetoothEnabled())) {
                this.logConnectionFailed("bluetooth_off");
                return this.safeSetState({step: STEP.BLUETOOTH_OFF, bt: BT.OFF});
            }
            const remembered = await AnuPath.getRememberedMeter();
            if (remembered && remembered.address) return this.connectTo(remembered, true);
            this.beginSelect();
        } catch (e) {
            this.logConnectionFailed("other");
            this.showError(e, null, "connect");
        }
    }

    turnOnBluetooth() {
        AnuPath.requestEnableBluetooth().catch(_.noop);
        clearInterval(this.bluetoothPoll);
        let tries = 0;
        this.bluetoothPoll = setInterval(async () => {
            tries++;
            const enabled = await AnuPath.isBluetoothEnabled().catch(() => false);
            if (enabled || tries > 30 || !this.active) {
                clearInterval(this.bluetoothPoll);
                if (enabled && this.active) this.start();
            }
        }, 1000);
    }

    removeScanSubscriptions() {
        this.scanSubscriptions.forEach((s) => s.remove());
        this.scanSubscriptions = [];
    }

    beginSelect() {
        this.safeSetState({step: STEP.SELECT, bt: BT.IDLE, devices: [], scanning: true});
        this.removeScanSubscriptions();
        // Meters stay in the order they were first seen (only their signal strength is updated), so rows do not
        // move under the worker's finger; the strongest signal is tagged "Nearest" instead of jumping to the top.
        // Functional update, so two events arriving together cannot drop a meter.
        this.scanSubscriptions.push(AnuPath.onDeviceFound((device) => {
            if (!this.active) return;
            this.setState((state) => {
                const index = _.findIndex(state.devices, (d) => d.address === device.address);
                if (index < 0) return {devices: [...state.devices, device]};
                const devices = [...state.devices];
                devices[index] = {...devices[index], rssi: device.rssi};
                return {devices};
            });
        }));
        this.scanSubscriptions.push(AnuPath.onScanStopped(() => {
            if (!this.active) return;
            // A search that ended without finding any meter counts as a failed connection attempt.
            if (_.isEmpty(this.state.devices)) this.logConnectionFailed("not_found");
            this.setState({scanning: false});
        }));
        this.startScan();
    }

    startScan() {
        this.attemptStartedAt = Date.now();
        AnuPath.startScan(15000).catch((e) => {
            if (this.active) this.logConnectionFailed(AnuPath.connectionFailureReason(e));
            this.showError(e, null, "connect");
        });
    }

    rescan() {
        this.safeSetState({devices: [], scanning: true});
        this.startScan();
    }

    async chooseAnother() {
        this.previousMeterId = _.get(this.meter, "address") || this.previousMeterId;
        await AnuPath.forgetMeter();
        await AnuPath.disconnect().catch(_.noop);
        this.beginSelect();
    }

    async connectTo(meter, remembered = false) {
        const session = this.session;
        this.meter = meter;
        this.remembered = remembered;
        this.lastError = null;
        if (!remembered && this.previousMeterId && this.previousMeterId !== meter.address) {
            logMedicalDeviceChanged(MEDICAL_DEVICE_TYPE, this.previousMeterId, meter.address);
        }
        if (!remembered) this.previousMeterId = null;
        this.safeSetState({step: STEP.CONNECTING, bt: BT.CONNECTING, message: null});
        try {
            await AnuPath.stopScan().catch(_.noop);
            this.deviceInfo = await AnuPath.connect(meter.address);
            if (session !== this.session) return;
            this.logConnection("connected", {
                deviceId: meter.address,
                details: AnuPath.analyticsDetails(this.deviceInfo),
                firmware: _.get(this.deviceInfo, "firmware")
            });
            await AnuPath.rememberMeter(meter);
            this.safeSetState({bt: BT.CONNECTED, deviceInfo: this.deviceInfo});
            this.readLatest();
        } catch (e) {
            // Still logged after the sheet was closed (failure_reason "cancelled"), but not after it was opened again.
            if (session !== this.session) return;
            this.logConnectionFailed(AnuPath.connectionFailureReason(e));
            this.safeSetState({bt: BT.FAILED});
            this.showError(e, this.t("Could not connect to the meter. Make sure it is switched on and close to the phone."), "connect");
        }
    }

    async readLatest() {
        this.safeSetState({step: STEP.READING, message: null});
        this.lastError = null;
        this.noRecords = false;
        try {
            const result = await AnuPath.fetchLatestOfType(this.props.testName);
            if (result.status === "OK") return this.safeSetState({step: STEP.PREVIEW, record: result.record});
            this.noRecords = result.status === "NO_RECORDS";
            this.safeSetState({step: STEP.NOT_FOUND, newest: result.newest || null});
        } catch (e) {
            this.showError(e, this.t("Could not read the result from the meter."), "read");
        }
    }

    onConnectionState(event) {
        if (!event || event.state !== "DISCONNECTED") return;
        if (this.state.bt === BT.CONNECTED || this.state.bt === BT.CONNECTING) {
            this.safeSetState({bt: this.state.step === STEP.PREVIEW ? BT.IDLE : BT.FAILED});
        }
    }

    onRecordPushed(record) {
        // A test finished while connected: use it straight away if it is the right test.
        if (AnuPath.isTestOfType(record, this.props.testName)) {
            this.safeSetState({step: STEP.PREVIEW, record});
        }
    }

    showError(error, fallback, stage = "connect") {
        const code = _.get(error, "code");
        if (this.active) this.lastError = {code, stage};
        const message = code === "BLUETOOTH_OFF" ? this.t("Bluetooth is off.") :
            code === "TIMEOUT" ? this.t("The meter did not respond. Keep it switched on and try again.") :
                (fallback || _.get(error, "message") || this.t("Something went wrong."));
        this.safeSetState({step: STEP.ERROR, message});
    }

    use() {
        const {record} = this.state;
        if (_.isNil(AnuPath.numericValue(record))) return;
        this.accepted = true;
        this.props.onUse(record, this.deviceInfo || {address: _.get(this.meter, "address")});
        this.close();
    }

    statusText() {
        const {bt} = this.state;
        const id = AnuPath.shortId(_.get(this.meter, "address"));
        if (bt === BT.CONNECTED) return this.t("Connected to meter {{id}}", {id});
        if (bt === BT.CONNECTING) return this.t("Connecting to meter {{id}}...", {id});
        if (bt === BT.FAILED) return this.t("Not connected");
        if (bt === BT.OFF) return this.t("Bluetooth is off");
        return this.t("Not connected");
    }

    // Details the meter reports about itself, shown once connected.
    renderDeviceInfo() {
        const info = this.state.deviceInfo;
        if (!SHOW_DEVICE_INFO || _.isNil(info) || this.state.bt !== BT.CONNECTED) return null;
        const rows = [
            [this.t("Device"), _.compact([this.t("anuPath nano"), info.model]).join(" ")],
            [this.t("Device ID"), info.address],
            [this.t("Firmware"), info.firmware],
            [this.t("Software"), info.software],
            [this.t("Manufacturer"), info.manufacturer]
        ].filter(([, value]) => !_.isEmpty(value));
        return (
            <View style={styles.infoBox}>
                {rows.map(([label, value]) =>
                    <View key={label} style={styles.infoRow}>
                        <Text style={styles.infoLabel}>{label}</Text>
                        <Text style={styles.infoValue}>{value}</Text>
                    </View>)}
            </View>
        );
    }

    renderButton(label, onPress, primary = false) {
        return (
            <TouchableOpacity key={label} activeOpacity={0.8} onPress={onPress}
                              style={[styles.button, primary ? styles.buttonPrimary : styles.buttonSecondary]}>
                <Text style={[styles.buttonText, primary ? styles.buttonTextPrimary : styles.buttonTextSecondary]}>{label}</Text>
            </TouchableOpacity>
        );
    }

    renderBusy(text, hint) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={Colors.BrandPrimaryDark}/>
                <Text style={styles.bodyText}>{text}</Text>
                {hint ? <Text style={styles.hint}>{hint}</Text> : null}
            </View>
        );
    }

    renderBody() {
        const {step, devices, scanning, record, newest, message} = this.state;
        const nearest = _.get(_.maxBy(devices, "rssi"), "address");
        const testName = this.t(this.props.testName);
        switch (step) {
            case STEP.CHECKING:
                return this.renderBusy(this.t("Checking Bluetooth..."));
            case STEP.UNAVAILABLE:
                return <View>
                    <Text style={styles.bodyText}>{this.t("This phone cannot connect to the meter (Bluetooth Low Energy not available). Use Manual run.")}</Text>
                    <View style={styles.actions}>{this.renderButton(this.t("Close"), () => this.close())}</View>
                </View>;
            case STEP.PERMISSION_DENIED:
                // After "Don't ask again" Android shows no dialog, so "Allow" opens the app's settings instead.
                return <View>
                    <Text style={styles.bodyText}>{this.state.permissionBlocked ?
                        this.t("Allow Nearby devices (Bluetooth) permission in the app settings so the app can find your meter. Then come back and tap Retry.") :
                        this.t("Allow Nearby devices (Bluetooth) permission so the app can find your meter.")}</Text>
                    <View style={styles.actions}>
                        {this.renderButton(this.t("Cancel"), () => this.close())}
                        {this.state.permissionBlocked ?
                            this.renderButton(this.t("Open settings"), () => AnuPath.openAppSettings().catch(_.noop), true) :
                            this.renderButton(this.t("Allow"), () => this.start(), true)}
                    </View>
                    {this.state.permissionBlocked ?
                        <TouchableOpacity onPress={() => this.start()}>
                            <Text style={styles.link}>{this.t("Retry")}</Text>
                        </TouchableOpacity> : null}
                </View>;
            case STEP.BLUETOOTH_OFF:
                return <View>
                    <Text style={styles.bodyText}>{this.t("Turn on Bluetooth to connect to the meter.")}</Text>
                    <View style={styles.actions}>
                        {this.renderButton(this.t("Cancel"), () => this.close())}
                        {this.renderButton(this.t("Turn on Bluetooth"), () => this.turnOnBluetooth(), true)}
                    </View>
                </View>;
            case STEP.SELECT:
                return <View>
                    <Text style={styles.bodyText}>{this.t("Switch on your meter and select it below. The nearest meter is marked.")}</Text>
                    <ScrollView style={styles.list}>
                        {devices.map((d) =>
                            <TouchableOpacity key={d.address} style={styles.deviceRow} onPress={() => this.connectTo(d)}>
                                <Icon name="bluetooth" size={22} color={Colors.BrandPrimaryDark}/>
                                <View style={{flex: 1, marginLeft: 12}}>
                                    <Text style={styles.deviceName}>{this.t("anuPath nano")} · {this.t("ID")} {AnuPath.shortId(d.address)}</Text>
                                    <Text style={styles.hint}>{d.address}</Text>
                                </View>
                                {devices.length > 1 && d.address === nearest ? <Text style={styles.nearestTag}>{this.t("Nearest")}</Text> : null}
                                <Icon name="chevron-right" size={22} color={Colors.TextHint}/>
                            </TouchableOpacity>)}
                        {devices.length === 0 && !scanning ?
                            <Text style={styles.hint}>{this.t("No meter found. Switch the meter on and keep it close to the phone.")}</Text> : null}
                    </ScrollView>
                    {scanning ? <View style={styles.scanningRow}>
                        <ActivityIndicator size="small" color={Colors.BrandPrimaryDark}/>
                        <Text style={[styles.hint, {marginLeft: 8}]}>{this.t("Searching for meters...")}</Text>
                    </View> : null}
                    <View style={styles.actions}>
                        {this.renderButton(this.t("Cancel"), () => this.close())}
                        {!scanning ? this.renderButton(this.t("Search again"), () => this.rescan(), true) : null}
                    </View>
                </View>;
            case STEP.CONNECTING:
                return this.renderBusy(this.t("Connecting to the meter..."), this.t("Keep the meter switched on and close to the phone."));
            case STEP.READING:
                return this.renderBusy(this.t("Reading the latest {{test}} result...", {test: testName}));
            case STEP.PREVIEW: {
                // Accept only a result whose value is a number; otherwise the form would keep its old value
                // while the device details changed (see DeviceReadingButton.onUse).
                const valid = !_.isNil(AnuPath.numericValue(record));
                return <View>
                    <View style={styles.preview}>
                        <Text style={styles.previewTest}>{this.t(record.testName)}</Text>
                        <Text style={styles.previewValue}>{_.isEmpty(_.trim(record.value)) ? "--" : record.value} <Text style={styles.previewUnit}>{record.unit}</Text></Text>
                        <Text style={styles.hint}>{this.testedOn(record.dateTime)}</Text>
                    </View>
                    {valid ? null :
                        <Text style={[styles.bodyText, {color: Colors.ValidationError}]}>
                            {this.t("The meter did not send a number for this result. Read again, or run the test again.")}
                        </Text>}
                    <View style={styles.actions}>
                        {this.renderButton(this.t("Cancel"), () => this.close())}
                        {valid ? this.renderButton(this.t("Accept"), () => this.use(), true) :
                            this.renderButton(this.t("Read again"), () => this.readLatest(), true)}
                    </View>
                </View>;
            }
            case STEP.NOT_FOUND: {
                const other = newest && !AnuPath.isTestOfType(newest, this.props.testName)
                    ? this.t("The latest result on the meter is {{test}} ({{time}}).", {test: this.t(newest.testName), time: newest.dateTime}) : null;
                return <View>
                    <Text style={styles.bodyText}>{this.t("No {{test}} result found on this meter. Run the {{test}} test, then tap Read again.",
                        {test: testName})}</Text>
                    {other ? <Text style={styles.hint}>{other}</Text> : null}
                    <View style={styles.actions}>
                        {this.renderButton(this.t("Close"), () => this.close())}
                        {this.renderButton(this.t("Read again"), () => this.readLatest(), true)}
                    </View>
                </View>;
            }
            case STEP.ERROR:
            default:
                return <View>
                    <Text style={[styles.bodyText, {color: Colors.ValidationError}]}>{message}</Text>
                    <TouchableOpacity onPress={() => this.chooseAnother()}>
                        <Text style={styles.link}>{this.t("Choose a different meter")}</Text>
                    </TouchableOpacity>
                    <View style={styles.actions}>
                        {this.renderButton(this.t("Close"), () => this.close())}
                        {this.renderButton(this.t("Retry"), () => this.start(), true)}
                    </View>
                </View>;
        }
    }

    render() {
        return (
            <Modal visible={this.props.visible} transparent animationType="slide" onRequestClose={() => this.close()}>
                <View style={styles.overlay}>
                    <View style={styles.sheet}>
                        <View style={styles.header}>
                            <BluetoothStatusIcon status={this.state.bt}/>
                            <View style={{flex: 1, marginLeft: 12}}>
                                <Text style={styles.title}>{this.t("Get reading from device")}</Text>
                                <Text style={[styles.hint, this.state.bt === BT.CONNECTED && {color: Colors.BrandPrimaryDark}]}>{this.statusText()}</Text>
                            </View>
                            <TouchableOpacity onPress={() => this.close()} hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}>
                                <Icon name="close" size={24} color={Colors.SecondaryText}/>
                            </TouchableOpacity>
                        </View>
                        {this.renderDeviceInfo()}
                        {this.renderBody()}
                    </View>
                </View>
            </Modal>
        );
    }
}

export default DeviceReadingSheet;

const styles = StyleSheet.create({
    overlay: {flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.35)"},
    sheet: {
        backgroundColor: Colors.WhiteContentBackground,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 28,
        maxHeight: "80%"
    },
    header: {flexDirection: "row", alignItems: "center", marginBottom: 16},
    infoBox: {
        backgroundColor: Colors.BrandLight, borderRadius: 8, borderWidth: 1, borderColor: Colors.BrandPrimaryDark,
        paddingVertical: 8, paddingHorizontal: 12, marginBottom: 12
    },
    infoRow: {flexDirection: "row", paddingVertical: 2},
    infoLabel: {width: 110, fontSize: 13, color: Colors.BrandPrimaryDark},
    infoValue: {flex: 1, fontSize: 13, color: Colors.BrandPrimaryDark, fontWeight: "600"},
    btIcon: {width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, alignItems: "center", justifyContent: "center"},
    title: {fontSize: 18, fontWeight: "600", color: Colors.TextPrimaryDark},
    bodyText: {fontSize: Styles.normalTextSize, color: Colors.TextPrimaryDark, marginTop: 8},
    hint: {fontSize: 13, color: Colors.SecondaryText, marginTop: 4},
    link: {fontSize: 14, color: Colors.BrandPrimaryDark, marginTop: 12, textDecorationLine: "underline"},
    center: {alignItems: "center", paddingVertical: 16},
    list: {maxHeight: 260, marginTop: 8},
    deviceRow: {
        flexDirection: "row", alignItems: "center", paddingVertical: 12, paddingHorizontal: 12, marginTop: 8,
        borderWidth: 1, borderColor: Colors.TextHint, borderRadius: 8
    },
    deviceName: {fontSize: Styles.normalTextSize, color: Colors.TextPrimaryDark, fontWeight: "500"},
    nearestTag: {
        fontSize: 12, fontWeight: "600", color: Colors.BrandPrimaryDark, backgroundColor: Colors.BrandLight,
        paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, marginRight: 6, overflow: "hidden"
    },
    scanningRow: {flexDirection: "row", alignItems: "center", marginTop: 12},
    preview: {borderWidth: 1, borderColor: Colors.BrandPrimaryDark, borderRadius: 12, padding: 16, marginTop: 4},
    previewTest: {fontSize: 14, color: Colors.BrandPrimaryDark, fontWeight: "600"},
    previewValue: {fontSize: 34, fontWeight: "700", color: Colors.TextPrimaryDark, marginTop: 4},
    previewUnit: {fontSize: 18, fontWeight: "500", color: Colors.SecondaryText},
    actions: {flexDirection: "row", justifyContent: "flex-end", marginTop: 20},
    button: {paddingVertical: 12, paddingHorizontal: 18, borderRadius: 8, marginLeft: 12},
    buttonPrimary: {backgroundColor: Colors.BrandPrimaryDark},
    buttonSecondary: {backgroundColor: Colors.WhiteContentBackground, borderWidth: 1, borderColor: Colors.TextHint},
    buttonText: {fontSize: 15, fontWeight: "600"},
    buttonTextPrimary: {color: Colors.TextOnPrimaryColor},
    buttonTextSecondary: {color: Colors.TextPrimaryDark}
});
