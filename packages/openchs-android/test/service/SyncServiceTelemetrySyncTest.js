import {assert} from "chai";

// SyncService reaches a long tail of native modules at import time; none are exercised here.
jest.mock("react-native-randombytes", () => ({randomBytes: () => []}));
jest.mock("react-native-zip-archive", () => ({zip: jest.fn(), unzip: jest.fn()}));
jest.mock("react-native-fs", () => ({DocumentDirectoryPath: "/mock"}));
jest.mock("../../src/framework/http/requests", () => ({
    getJSON: jest.fn(),
    getJSONTimed: jest.fn(),
    get: jest.fn(),
    post: jest.fn(),
    postTimed: jest.fn(),
}));

import {postTimed} from "../../src/framework/http/requests";
import ConventionalRestClient from "../../src/service/rest/ConventionalRestClient";
import SyncService from "../../src/service/SyncService";
import {SyncTelemetry} from "openchs-models";

// telemetrySync runs after the row is saved, so a post it cannot complete must leave the row
// queued for the next sync rather than dropping it.
describe("SyncService.telemetrySync", () => {
    const telemetryMetadata = [{
        entityName: "SyncTelemetry",
        resourceName: "syncTelemetry",
        schemaName: SyncTelemetry.schema.name
    }];

    const runWith = (postImplementation) => {
        postTimed.mockReset();
        postTimed.mockImplementation(postImplementation);
        const popped = [];
        const syncService = {
            entityQueueService: {
                getAllQueuedItems: (metaData) => ({metaData, entities: [{resource: {uuid: "st-1"}}]}),
                popItem: (uuid) => () => popped.push(uuid)
            },
            conventionalRestClient: new ConventionalRestClient({getSettings: () => ({serverURL: "http://server"})})
        };
        const promise = SyncService.prototype.telemetrySync.call(syncService, telemetryMetadata, () => {
        });
        return {popped, promise};
    };

    it("pops the row once its post has succeeded", async () => {
        const {popped, promise} = runWith(() => Promise.resolve({response: {}, timings: {}}));

        await promise;

        assert.deepEqual(popped, ["st-1"]);
    });

    it("leaves the row queued when the post fails, so the telemetry is retried", async () => {
        const {popped, promise} = runWith(() => Promise.reject(new Error("syncTimeoutError")));

        await promise.catch(() => {
        });

        assert.deepEqual(popped, [], "a row popped before its post lands is telemetry lost for good");
    });
});
