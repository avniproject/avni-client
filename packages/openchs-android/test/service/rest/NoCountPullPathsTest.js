import {assert} from "chai";
import _ from "lodash";
import {EntityMetaData} from "openchs-models";
import {noCountPullPath} from "../../../src/service/rest/NoCountPullPaths";

// Kept on the counting pull on purpose, each with its reason.
const keepsCountingPull = {
    ResetSync: "the server has no no-count address for it, and it holds a few records per user",
    UserInfo: "/v2/me returns one record and never counted",
    EntityApprovalStatus: "the server's /v2/syncDetails never names the untyped kind",
};
// The phone sends these and never pulls them: the server's SyncEntityName has no entry for them.
const sentOnly = ["SyncTelemetry", "RuleFailureTelemetry", "VideoTelemetric"];

describe("NoCountPullPaths", () => {
    const allMetadata = EntityMetaData.model();

    it("gives every kind of record the phone pulls a no-count address, except the ones kept on purpose", () => {
        const missing = allMetadata
            .filter(m => m.type === "tx")
            .filter(m => !_.has(keepsCountingPull, m.entityName) && !_.includes(sentOnly, m.entityName))
            .filter(m => _.isNil(noCountPullPath(m)))
            .map(m => m.entityName);
        assert.deepEqual(missing, []);
    });

    it("keeps reset sync, user info and the untyped approval status on their counting pull", () => {
        _.keys(keepsCountingPull).forEach(name => {
            const metadata = _.find(allMetadata, m => m.entityName === name);
            assert.isDefined(metadata, name);
            assert.isUndefined(noCountPullPath(metadata), name);
        });
    });

    it("gives no reference data a no-count address", () => {
        const switched = allMetadata
            .filter(m => m.type !== "tx" && !_.isNil(noCountPullPath(m)))
            .map(m => m.entityName);
        assert.deepEqual(switched, []);
    });

    it("asks each kind at its own server resource", () => {
        const searchAddressed = ["Session", "AttendanceRecord"];
        allMetadata.filter(m => !_.isNil(noCountPullPath(m))).forEach(m => {
            const expected = _.includes(searchAddressed, m.entityName)
                ? `${m.resourceName}/search/lastModified/v2`
                : `${m.resourceName}/v2`;
            assert.equal(noCountPullPath(m), expected, m.entityName);
        });
    });
});
