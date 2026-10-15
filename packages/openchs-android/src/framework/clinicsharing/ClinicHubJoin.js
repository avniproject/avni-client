import NetInfo from "@react-native-community/netinfo";
import * as ClinicHubWifi from "./ClinicHubWifi";
import clinicHubDiscovery from "./ClinicHubDiscovery";
import {encodeJoinPayload, parseJoinPayload} from "./ClinicJoinPayload";

// A phone must find the hub within 30 seconds of scanning.
export const JOIN_TIMEOUT_MS = 30 * 1000;

// NSD can be told which network to scan from Android 13 (API 33).
const SCAN_ON_INTERFACE_MIN_API_LEVEL = 33;

export const JoinError = Object.freeze({
    hubNeedsAndroid10: "hubNeedsAndroid10",
    badCode: "badCode",
    joinFailed: "joinFailed",
    cannotReadNetwork: "cannotReadNetwork",
    wrongNetwork: "wrongNetwork",
    hubNotFound: "hubNotFound",
    joinInProgress: "joinInProgress",
});

const joinError = (code, message, details = {}, cause) => Object.assign(new Error(message), {code, details, cause});

export class ClinicHubJoin {
    constructor({wifi, discovery, netInfo, now = () => Date.now()}) {
        this.wifi = wifi;
        this.discovery = discovery;
        this.netInfo = netInfo;
        this.now = now;
        this.publishedName = null;
        this.joining = false;
    }

    async startHubNetwork({hubId, epoch, key, port}) {
        if (!this.wifi.canStartHub()) throw joinError(JoinError.hubNeedsAndroid10, "A hub needs Android 10 or later");
        const {ssid, passphrase} = await this.wifi.startHotspot();
        try {
            this.publishedName = await this.discovery.publishHub({hubId, port});
        } catch (error) {
            await this.wifi.stopHotspot();
            throw error;
        }
        return {ssid, passphrase, qrValue: encodeJoinPayload({ssid, passphrase, hubId, epoch, key})};
    }

    async stopHubNetwork() {
        if (this.publishedName) {
            const name = this.publishedName;
            this.publishedName = null;
            await this.discovery.unpublishHub(name).catch(() => {});
        }
        await this.wifi.stopHotspot();
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

    async _joinHub(qrText) {
        const parsed = parseJoinPayload(qrText);
        if (!parsed.ok) throw joinError(JoinError.badCode, "This is not a hub's code", {payloadError: parsed.error});
        const {ssid, passphrase, hubId, epoch, key} = parsed.payload;
        const deadline = this.now() + JOIN_TIMEOUT_MS;
        let networkInterface;
        let joinedByScan = false;
        if (this.wifi.canJoinByScan()) {
            try {
                const joined = await this.wifi.joinNetwork(ssid, passphrase, JOIN_TIMEOUT_MS);
                joinedByScan = true;
                if (this.wifi.apiLevel() >= SCAN_ON_INTERFACE_MIN_API_LEVEL) networkInterface = joined.interfaceName || undefined;
            } catch (error) {
                throw joinError(JoinError.joinFailed, `Could not join ${ssid}`, {}, error);
            }
        } else {
            await this._checkJoinedByHand(ssid);
        }
        try {
            const {host, port} = await this.discovery.findHub(hubId, {timeoutMs: Math.max(deadline - this.now(), 0), networkInterface});
            return {host, port, hubId, epoch, key, ssid};
        } catch (error) {
            // Holding the hub's network for nothing would keep a Wi-Fi-only phone off its usual Wi-Fi.
            if (joinedByScan) await this.wifi.leaveNetwork().catch(() => {});
            throw joinError(JoinError.hubNotFound, "The hub did not answer on its network", {}, error);
        }
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

export default new ClinicHubJoin({wifi: ClinicHubWifi, discovery: clinicHubDiscovery, netInfo: NetInfo});
