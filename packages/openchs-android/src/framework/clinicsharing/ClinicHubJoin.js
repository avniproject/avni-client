import NetInfo from "@react-native-community/netinfo";
import * as ClinicHubWifi from "./ClinicHubWifi";
import {encodeJoinPayload, parseJoinPayload} from "./ClinicJoinPayload";
import {CLINIC_PORT} from "./ClinicSharingConstants";

// A phone must join the hub's network within 60 seconds of scanning: Android's own search plus the person's Connect tap.
export const JOIN_TIMEOUT_MS = 60 * 1000;
// Android answers a hotspot start in seconds; one it never answers would leave the hub screen starting for good.
export const HOTSPOT_START_TIMEOUT_MS = 30 * 1000;

export const JoinError = Object.freeze({
    hubNeedsAndroid10: "hubNeedsAndroid10",
    badCode: "badCode",
    joinFailed: "joinFailed",
    cannotReadNetwork: "cannotReadNetwork",
    wrongNetwork: "wrongNetwork",
    hubNotFound: "hubNotFound",
    joinInProgress: "joinInProgress",
    wifiOff: "wifiOff",
    hotspotFailed: "hotspotFailed",
    locationOff: "locationOff",
    hotspotNotAllowed: "hotspotNotAllowed",
});

// The native module's reasons a hotspot did not start, as errors the screen can put in words staff can act on.
const HOTSPOT_START_ERRORS = {E_HOTSPOT: JoinError.hotspotFailed, E_LOCATION_OFF: JoinError.locationOff, E_PERMISSION: JoinError.hotspotNotAllowed};

const joinError = (code, message, details = {}, cause) => Object.assign(new Error(message), {code, details, cause});

export class ClinicHubJoin {
    constructor({wifi, netInfo}) {
        this.wifi = wifi;
        this.netInfo = netInfo;
        this.joining = false;
    }

    async startHubNetwork({hubId, epoch, key}) {
        if (!this.wifi.canStartHub()) throw joinError(JoinError.hubNeedsAndroid10, "A hub needs Android 10 or later");
        const started = this.wifi.startHotspot().catch((error) => {
            const code = HOTSPOT_START_ERRORS[error && error.code];
            throw code ? joinError(code, error.message, {}, error) : error;
        });
        let timer;
        const tooLong = new Promise((resolve, reject) => {
            timer = setTimeout(() => reject(joinError(JoinError.hotspotFailed, "Android did not start the hub's Wi-Fi in time")), HOTSPOT_START_TIMEOUT_MS);
        });
        try {
            const {ssid, passphrase} = await Promise.race([started, tooLong]);
            return {ssid, passphrase, qrValue: encodeJoinPayload({ssid, passphrase, hubId, epoch, key})};
        } catch (error) {
            if (error.code === JoinError.hotspotFailed && !error.cause) {
                // The native stop also rejects the start still waiting, which nobody reads any more.
                started.catch(() => {});
                await this.wifi.stopHotspot().catch(() => {});
            }
            throw error;
        } finally {
            clearTimeout(timer);
        }
    }

    stopHubNetwork() {
        return this.wifi.stopHotspot();
    }

    // One join at a time: a second would replace the first's network request and leave its caller waiting.
    async joinHub(qrText) {
        if (this.joining) throw joinError(JoinError.joinInProgress, "A join is already under way");
        this.joining = true;
        try {
            return await this._joinHub(qrText);
        } finally {
            this.joining = false;
        }
    }

    // The hub runs the hotspot, so the joined network's gateway is the hub.
    async _joinHub(qrText) {
        const parsed = parseJoinPayload(qrText);
        if (!parsed.ok) throw joinError(JoinError.badCode, "This is not a hub's code", {payloadError: parsed.error});
        const {ssid, passphrase, hubId, epoch, key} = parsed.payload;
        // An unanswered check must not stop a join that might work.
        if (!(await this.wifi.wifiEnabled().catch(() => true))) throw joinError(JoinError.wifiOff, "Wi-Fi is off on this phone");
        let gateway;
        if (this.wifi.canJoinByScan()) {
            try {
                ({gateway} = await this.wifi.joinNetwork(ssid, passphrase, JOIN_TIMEOUT_MS));
            } catch (error) {
                throw joinError(JoinError.joinFailed, `Could not join ${ssid}`, {}, error);
            }
            // Holding the hub's network for nothing would keep a Wi-Fi-only phone off its usual Wi-Fi.
            if (!gateway) await this.wifi.leaveNetwork().catch(() => {});
        } else {
            await this._checkJoinedByHand(ssid);
            gateway = await this.wifi.wifiGateway().catch(() => null);
        }
        if (!gateway) throw joinError(JoinError.hubNotFound, `Android gave no gateway address on ${ssid}`);
        return {host: gateway, port: CLINIC_PORT, hubId, epoch, key, ssid};
    }

    // Below Android 10 no name means either no Wi-Fi or a hidden name, so whether Wi-Fi is connected decides which.
    async _checkJoinedByHand(ssid) {
        const current = await this.wifi.currentSsid();
        if (current === ssid) return;
        if (current === null && await this.wifi.wifiConnected()) {
            throw joinError(JoinError.cannotReadNetwork, "Android did not say which Wi-Fi network the phone is on");
        }
        throw joinError(JoinError.wrongNetwork, `The phone is on ${current === null ? "no Wi-Fi network" : current}, not ${ssid}`, {current, expected: ssid});
    }

    // A hub restart makes a new network, so a phone on the old one has to scan the new code.
    watchHubNetwork({ssid}, onRejoinNeeded) {
        let asked = false;
        const askOnce = () => {
            if (asked) return;
            asked = true;
            onRejoinNeeded();
        };
        if (this.wifi.canJoinByScan()) {
            return this.wifi.onNetworkLost((event) => event.ssid === ssid && askOnce());
        }
        return this.netInfo.addEventListener(() => {
            this.wifi.currentSsid()
                .then(async (current) => {
                    if (current === ssid) return;
                    // No name while Wi-Fi is connected means Android will not say, not that the phone left.
                    if (current === null && await this.wifi.wifiConnected()) return;
                    askOnce();
                })
                .catch(askOnce);
        });
    }
}

export default new ClinicHubJoin({wifi: ClinicHubWifi, netInfo: NetInfo});
