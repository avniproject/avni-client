import Zeroconf from "react-native-zeroconf";
import General from "../../utility/General";

// The hub announces itself on its hotspot over mDNS, and a phone that joined looks it up by the hub id in the QR code
// (avni-client#2173). A subnet scan does not work: react-native-tcp-socket queues connects on two threads with no timeout.
export const HUB_SERVICE = Object.freeze({type: "avnihub", protocol: "tcp", domain: "local."});
export const HUB_PORT = 7373;

const hubServiceName = (hubId) => `Avni hub ${hubId.slice(0, 8)}`;

const discoveryError = (code, message) => Object.assign(new Error(message), {code});
const hubNotFound = () => discoveryError("HUB_NOT_FOUND", "No hub answered on this network");

export class ClinicHubDiscovery {
    constructor(createZeroconf) {
        this.createZeroconf = createZeroconf;
        this.zeroconf = null;
        this.finding = false;
    }

    _zeroconf() {
        return this.zeroconf || (this.zeroconf = this.createZeroconf());
    }

    async publishHub({hubId, port = HUB_PORT}) {
        const published = await this._zeroconf().publishService({...HUB_SERVICE, name: hubServiceName(hubId), port, txt: {hubId}});
        // Android renames a service whose name is already taken on the network.
        return published.name;
    }

    unpublishHub(name) {
        return this._zeroconf().unpublishService(name);
    }

    findHub(hubId, {timeoutMs, networkInterface} = {}) {
        // One scan at a time: the first search to finish would stop the scan the other is waiting on.
        if (this.finding) return Promise.reject(discoveryError("FIND_IN_PROGRESS", "A search for the hub is already running"));
        this.finding = true;
        const zeroconf = this._zeroconf();
        return new Promise((resolve, reject) => {
            let unsubscribeResolved = () => {};
            let unsubscribeError = () => {};
            const finish = (settle, value) => {
                clearTimeout(timer);
                unsubscribeResolved();
                unsubscribeError();
                zeroconf.stop();
                this.finding = false;
                settle(value);
            };
            const timer = setTimeout(() => finish(reject, hubNotFound()), timeoutMs);
            unsubscribeResolved = zeroconf.subscribe("resolved", (service) => {
                const isOurHub = service.txt && service.txt.hubId === hubId;
                if (isOurHub && service.ipv4 && service.ipv4.length > 0) finish(resolve, {host: service.ipv4[0], port: service.port});
            });
            // Errors here are often about some other service on the network; the timeout decides.
            unsubscribeError = zeroconf.subscribe("error", (error) => General.logWarn("ClinicHubDiscovery", error && error.message));
            zeroconf.scan({...HUB_SERVICE, networkInterface});
        });
    }
}

export default new ClinicHubDiscovery(() => new Zeroconf());
