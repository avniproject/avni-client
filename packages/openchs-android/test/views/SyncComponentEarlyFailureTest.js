// SyncComponent's imports reach native modules at load time; none are exercised here.
jest.mock("react-native-randombytes", () => ({randomBytes: () => []}));
jest.mock("react-native-zip-archive", () => ({zip: jest.fn(), unzip: jest.fn()}));
jest.mock("react-native-fs", () => ({DocumentDirectoryPath: "/mock"}));
jest.mock("react-native-file-viewer", () => ({open: jest.fn()}));
jest.mock("react-native-share", () => ({}));
jest.mock("@react-native-clipboard/clipboard", () => ({}));
jest.mock("react-native-vision-camera", () => ({}));
jest.mock("@react-native-documents/picker", () => ({}));
jest.mock("react-native-background-timer", () => ({}));
jest.mock("react-native-geolocation-service", () => ({
    getCurrentPosition: jest.fn(), watchPosition: jest.fn(), clearWatch: jest.fn()
}));

import SyncComponent from "../../src/views/SyncComponent";
import SyncService from "../../src/service/SyncService";
import SyncPhaseTimer, {SyncPhases} from "../../src/utility/SyncPhaseTimer";
import AvniError from "../../src/framework/errorHandling/AvniError";

const clockOf = (...times) => {
    const queue = [...times];
    return () => queue.shift();
};

// A SyncService whose last sync finished every phase with traffic - the state a new sync starts from.
const serviceAfterAFullSync = () => {
    const svc = Object.create(SyncService.prototype);
    const timer = new SyncPhaseTimer(clockOf(0, 1000, 1000, 5000, 5000, 20000));
    [SyncPhases.MEDIA, SyncPhases.PUSH, SyncPhases.PULL].forEach(phase => { timer.start(phase); timer.end(phase); });
    svc._syncPhaseTimer = timer;
    svc.transferStats.download.add({bytes: 1000000, transferMs: 4000});
    svc.transferStats.upload.add({bytes: 50000, transferMs: 2000});
    svc.reduxStore = {getState: () => ({syncTelemetryActions: {entityStatus: {
        push: [{entity: 'Individual', todo: 10, done: 10}],
        pull: [{entity: 'Individual', todo: 200, done: 200}]
    }}})};
    svc.mediaQueueService = {getUploadStats: () => ({bytes: 3000000, transferMs: 12000})};
    svc.acquireLock = () => 'lock-1';
    svc.releaseLock = jest.fn();
    svc.sync = jest.fn();
    return svc;
};

describe("SyncComponent.startSync failing before sync() runs", () => {
    it("reports only failed_phase setup, nothing from the previous sync", async () => {
        const syncService = serviceAfterAFullSync();
        expect(syncService.syncFailureParams().failed_phase).toBe('finalise'); // stale state is really there

        let paramsAtFailure;
        const component = {
            state: {isConnected: true, startTime: Date.now()},
            context: {getService: () => syncService},
            _preSync: () => { throw new Error('preSync blew up'); },
            // Capture what _onError would send, at the moment it is called.
            _onError: () => { paramsAtFailure = syncService.syncFailureParams(); },
            dispatchAction: jest.fn()
        };

        await SyncComponent.prototype.startSync.call(component);

        expect(syncService.sync).not.toHaveBeenCalled();
        expect(paramsAtFailure).toEqual({failed_phase: 'setup'});
        expect(syncService.releaseLock).toHaveBeenCalledWith('lock-1');
    });
});

describe("SyncComponent._onError", () => {
    const componentWith = (syncService) => ({
        context: {getService: () => syncService},
        viewName: () => "SyncComponent",
        dispatchAction: jest.fn(),
        ErrorAlert: jest.fn()
    });
    const onErrorParams = (component) => component.dispatchAction.mock.calls
        .find(([, params]) => params && "phaseParams" in params)[1];
    const dispatched = (component, type) => component.dispatchAction.mock.calls
        .filter(([actionType]) => actionType === type)
        .map(([, params]) => params);

    it("sends this sync's phases, failed step and speeds with the failure", () => {
        const syncService = serviceAfterAFullSync();
        const component = componentWith(syncService);

        SyncComponent.prototype._onError.call(component, AvniError.create("Sync failed", "report"), true);

        const [telemetry] = dispatched(component, "SyncTelemetryActions.SYNC_FAILED");
        expect(Object.keys(telemetry.phases)).toEqual(["media", "push", "pull"]);
        expect(telemetry.failedPhase).toBe("finalise");
        expect(telemetry.bandwidth).toHaveProperty("downloadThroughput");
        const errorParams = onErrorParams(component);
        expect(errorParams.phaseParams).toMatchObject({failed_phase: "finalise", download_throughput_kbps: 2000});
    });

    it("sends no phases or speeds when the phone was offline and no sync ran", () => {
        const syncService = serviceAfterAFullSync();
        const component = componentWith(syncService);

        SyncComponent.prototype._onError.call(component, AvniError.create("Offline", "report"), true, false);

        expect(dispatched(component, "SyncTelemetryActions.SYNC_FAILED")).toHaveLength(0);
        const errorParams = onErrorParams(component);
        expect(errorParams.phaseParams).toEqual({});
    });
});

