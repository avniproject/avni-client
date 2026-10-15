import {assert} from "chai";

jest.mock("../../../src/framework/http/requests", () => ({
    getJSON: jest.fn(),
    getJSONTimed: jest.fn(),
    get: jest.fn(),
    post: jest.fn(),
    postTimed: jest.fn(),
}));

import _ from "lodash";
import {EntityMetaData} from "openchs-models";
import {getJSONTimed, postTimed} from "../../../src/framework/http/requests";
import ConventionalRestClient from "../../../src/service/rest/ConventionalRestClient";
import {noCountPullPath} from "../../../src/service/rest/NoCountPullPaths";

const settingsService = {getSettings: () => ({serverURL: "http://server"})};

function entitiesOfType(entityName, resourceName, uuids) {
    return {
        metaData: {entityName, resourceName},
        entities: uuids.map(uuid => ({resource: {uuid}})),
    };
}

function trackPops() {
    const popped = [];
    const onCompleteOfIndividualPost = (metaData, uuid) => () => {
        popped.push(uuid);
        return Promise.resolve();
    };
    return {popped, onCompleteOfIndividualPost};
}

describe("ConventionalRestClient.postAllEntities", () => {
    let client;

    beforeEach(() => {
        postTimed.mockReset();
        client = new ConventionalRestClient(settingsService);
    });

    it("drops a failing RuleFailureTelemetry post and continues with remaining entities", async () => {
        postTimed.mockImplementation((url, resource) =>
            resource.uuid === "t2" ? Promise.reject(new Error("500")) : Promise.resolve({}));
        const {popped, onCompleteOfIndividualPost} = trackPops();
        const telemetry = entitiesOfType("RuleFailureTelemetry", "ruleFailureTelemetry", ["t1", "t2", "t3"]);
        const individuals = entitiesOfType("Individual", "individual", ["i1"]);
        const completedTypes = [];

        await client.postAllEntities([telemetry, individuals], onCompleteOfIndividualPost,
            (entityName) => completedTypes.push(entityName));

        assert.deepEqual(popped, ["t1", "t2", "t3", "i1"], "failed telemetry must still be popped off the queue");
        assert.deepEqual(completedTypes, ["RuleFailureTelemetry", "Individual"], "push must proceed past the failure");
        assert.equal(postTimed.mock.calls.length, 4);
    });

    it("hands each entity's completion callback the push timings", async () => {
        // The callback factory must return the callback. telemetrySync once ran it inline and
        // returned undefined, which only survived while the result was passed to a bare .then().
        postTimed.mockImplementation(() => Promise.resolve({response: {}, timings: {serializeMs: 2, networkMs: 30}}));
        const seen = [];
        const onCompleteOfIndividualPost = (metaData, uuid) => (timings) => seen.push([uuid, timings]);
        const individuals = entitiesOfType("Individual", "individual", ["i1", "i2"]);

        await client.postAllEntities([individuals], onCompleteOfIndividualPost, () => {
        });

        assert.deepEqual(seen, [["i1", {serializeMs: 2, networkMs: 30}], ["i2", {serializeMs: 2, networkMs: 30}]]);
    });

    it("aborts on failure of a non-best-effort entity without popping it", async () => {
        postTimed.mockImplementation((url, resource) =>
            resource.uuid === "i2" ? Promise.reject(new Error("500")) : Promise.resolve({}));
        const {popped, onCompleteOfIndividualPost} = trackPops();
        const individuals = entitiesOfType("Individual", "individual", ["i1", "i2", "i3"]);

        let rejected = false;
        await client.postAllEntities([individuals], onCompleteOfIndividualPost, () => {
        }).catch(() => rejected = true);

        assert.isTrue(rejected, "sync must fail so unpushed data is retried");
        assert.deepEqual(popped, ["i1"], "the failing entity and later ones must stay queued");
    });
});

const NOW = "2026-10-15T00:00:00.000Z";

function pullClient(pageSize = 100) {
    return new ConventionalRestClient({getSettings: () => ({serverURL: "http://server", pageSize})});
}

function metadataFor(entityName, entityTypeUuid = "") {
    const metadata = _.find(EntityMetaData.model(), m => m.entityName === entityName);
    return _.assignIn({syncStatus: {loadedSince: new Date(0), entityTypeUuid}}, metadata);
}

function sliceAnswer(resourceName, uuids, hasNext) {
    return {
        body: {_embedded: {[resourceName]: uuids.map(uuid => ({uuid}))}, slice: {size: 100, number: 0, hasNext}},
        timings: {networkMs: 1},
    };
}

function queryOf(url) {
    return _.fromPairs(url.split("?")[1].split("&").map(pair => pair.split("=")));
}

function savedRows() {
    const saved = [];
    const onGetOfAnEntity = (metadata, rows) => {
        saved.push(...rows.map(row => row.uuid));
        return Promise.resolve();
    };
    return {saved, onGetOfAnEntity};
}

describe("ConventionalRestClient no-count pull", () => {
    beforeEach(() => {
        getJSONTimed.mockReset();
    });

    it("asks the no-count address and keeps asking while the server says more remain", async () => {
        getJSONTimed
            .mockResolvedValueOnce(sliceAnswer("individual", ["a", "b"], true))
            .mockResolvedValueOnce(sliceAnswer("individual", ["c", "d"], true))
            .mockResolvedValueOnce(sliceAnswer("individual", ["e"], false));
        const {saved, onGetOfAnEntity} = savedRows();

        await pullClient().getAllForEntity(metadataFor("Individual", "st1"), onGetOfAnEntity, _.noop, _.noop, NOW, "device1");

        assert.deepEqual(saved, ["a", "b", "c", "d", "e"]);
        const urls = getJSONTimed.mock.calls.map(([url]) => url);
        assert.equal(urls.length, 3);
        urls.forEach((url, i) => {
            assert.match(url, /^http:\/\/server\/individual\/v2\?/);
            assert.equal(queryOf(url).page, String(i));
            assert.equal(queryOf(url).size, "100");
            assert.equal(queryOf(url).subjectTypeUuid, "st1");
            assert.equal(queryOf(url).now, NOW);
        });
    });

    it("every kind on the no-count pull asks for its next batch and hands over all its rows", async () => {
        const kinds = EntityMetaData.model().filter(m => m.type === "tx" && !_.isNil(noCountPullPath(m)));
        assert.equal(kinds.length, 24);
        for (const kind of kinds) {
            getJSONTimed.mockReset();
            getJSONTimed
                .mockResolvedValueOnce(sliceAnswer(kind.resourceName, ["first"], true))
                .mockResolvedValueOnce(sliceAnswer(kind.resourceName, ["second"], false));
            const {saved, onGetOfAnEntity} = savedRows();

            await pullClient().getAllForEntity(metadataFor(kind.entityName, "t1"), onGetOfAnEntity, _.noop, _.noop, NOW, "device1");

            assert.equal(getJSONTimed.mock.calls.length, 2, kind.entityName);
            assert.deepEqual(saved, ["first", "second"], kind.entityName);
        }
    });

    it("asks again after a full batch even when the server served fewer rows than asked for", async () => {
        const thousand = _.range(1000).map(i => `r${i}`);
        getJSONTimed
            .mockResolvedValueOnce(sliceAnswer("individual", thousand, true))
            .mockResolvedValueOnce(sliceAnswer("individual", ["last"], false));
        const {saved, onGetOfAnEntity} = savedRows();

        await pullClient(2000).getAllForEntity(metadataFor("Individual", "st1"), onGetOfAnEntity, _.noop, _.noop, NOW, "device1");

        assert.equal(getJSONTimed.mock.calls.length, 2, "1000 rows for a request of 2000 is not the end");
        assert.equal(queryOf(getJSONTimed.mock.calls[0][0]).size, "2000");
        assert.equal(saved.length, 1001);
    });

    it("asks Session and AttendanceRecord at their search address", async () => {
        getJSONTimed
            .mockResolvedValueOnce(sliceAnswer("session", ["s1"], false))
            .mockResolvedValueOnce(sliceAnswer("attendanceRecord", ["a1"], false));
        const {onGetOfAnEntity} = savedRows();

        await pullClient().getAllForEntity(metadataFor("Session", "st1"), onGetOfAnEntity, _.noop, _.noop, NOW, "device1");
        await pullClient().getAllForEntity(metadataFor("AttendanceRecord", "st1"), onGetOfAnEntity, _.noop, _.noop, NOW, "device1");

        assert.match(getJSONTimed.mock.calls[0][0], /^http:\/\/server\/session\/search\/lastModified\/v2\?/);
        assert.match(getJSONTimed.mock.calls[1][0], /^http:\/\/server\/attendanceRecord\/search\/lastModified\/v2\?/);
    });

    it("stops after one request when everything fits in one batch", async () => {
        getJSONTimed.mockResolvedValueOnce(sliceAnswer("encounter", ["e1", "e2"], false));
        const {saved, onGetOfAnEntity} = savedRows();

        await pullClient().getAllForEntity(metadataFor("Encounter", "et1"), onGetOfAnEntity, _.noop, _.noop, NOW, "device1");

        assert.equal(getJSONTimed.mock.calls.length, 1);
        assert.deepEqual(saved, ["e1", "e2"]);
    });

    it("an empty pull asks once and hands over no rows", async () => {
        getJSONTimed.mockResolvedValueOnce({body: {slice: {size: 100, number: 0, hasNext: false}}, timings: {}});
        const handedOver = [];

        await pullClient().getAllForEntity(metadataFor("News"), (metadata, rows) => handedOver.push(rows), _.noop, _.noop, NOW, "device1");

        assert.equal(getJSONTimed.mock.calls.length, 1);
        assert.deepEqual(handedOver, [[]]);
    });

    it("fails loudly when the answer carries no slice", async () => {
        getJSONTimed.mockResolvedValueOnce({body: {_embedded: {individual: [{uuid: "a"}]}, page: {totalPages: 1}}, timings: {}});
        const {saved, onGetOfAnEntity} = savedRows();

        let error;
        await pullClient().getAllForEntity(metadataFor("Individual", "st1"), onGetOfAnEntity, _.noop, _.noop, NOW, "device1")
            .catch(e => error = e);

        assert.isDefined(error, "an answer the loop cannot read must fail the sync");
        assert.include(error.message, "Individual");
        assert.deepEqual(saved, [], "nothing from an unreadable answer is saved");
    });

    it("fails loudly when the slice carries no hasNext", async () => {
        getJSONTimed.mockResolvedValueOnce({body: {_embedded: {individual: [{uuid: "a"}]}, slice: {size: 100, number: 0}}, timings: {}});
        const {onGetOfAnEntity} = savedRows();

        let error;
        await pullClient().getAllForEntity(metadataFor("Individual", "st1"), onGetOfAnEntity, _.noop, _.noop, NOW, "device1")
            .catch(e => error = e);

        assert.isDefined(error);
        assert.include(error.message, "slice.hasNext", "fails for the missing signal, not by accident");
        assert.equal(getJSONTimed.mock.calls.length, 1);
    });

    it("fails the pull when a later batch fails, keeping the batches already saved", async () => {
        getJSONTimed
            .mockResolvedValueOnce(sliceAnswer("programEncounter", ["p1", "p2"], true))
            .mockRejectedValueOnce(new Error("timeout"));
        const {saved, onGetOfAnEntity} = savedRows();

        let error;
        await pullClient().getAllForEntity(metadataFor("ProgramEncounter", "pet1"), onGetOfAnEntity, _.noop, _.noop, NOW, "device1")
            .catch(e => error = e);

        assert.equal(error.message, "timeout");
        assert.deepEqual(saved, ["p1", "p2"], "the first batch stays saved, so the next sync resumes after it");
        assert.equal(getJSONTimed.mock.calls.length, 2);
    });
});
