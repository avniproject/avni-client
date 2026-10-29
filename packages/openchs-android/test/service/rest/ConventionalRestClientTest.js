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
import ProgressbarStatus from "../../../src/service/ProgressbarStatus";

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

describe("ConventionalRestClient no-count pull: sync bar and telemetry", () => {
    beforeEach(() => {
        getJSONTimed.mockReset();
    });

    it("clears the label first, then moves the bar once per kind of record, after its last batch", async () => {
        const events = [];
        getJSONTimed.mockImplementation((url) => {
            events.push(`get page ${queryOf(url).page}`);
            const page = Number(queryOf(url).page);
            return Promise.resolve(sliceAnswer("individual", [`r${page}`], page < 2));
        });

        await pullClient().getAllForEntity(metadataFor("Individual", "st1"), () => Promise.resolve(), _.noop,
            (entityName, totalNumberOfPages, currentPageNumber) => events.push(["bar", entityName, totalNumberOfPages, currentPageNumber]),
            NOW, "device1");

        assert.deepEqual(events, [["bar", "Individual", Infinity, undefined], "get page 0", "get page 1", "get page 2", ["bar", "Individual", 1, undefined]]);
    });

    it("records no expected count for a no-count pull", async () => {
        getJSONTimed.mockResolvedValueOnce(sliceAnswer("individual", ["a"], false));
        const onGetOfFirstPage = jest.fn();

        await pullClient().getAllForEntity(metadataFor("Individual", "st1"), () => Promise.resolve(), onGetOfFirstPage, _.noop, NOW, "device1");

        assert.equal(onGetOfFirstPage.mock.calls.length, 0, "the answer carries no total to record");
    });

    it("the bar never moves backwards, shows no batch number, and adds each kind's whole weight", async () => {
        const seen = [];
        const status = new ProgressbarStatus((progress, totalNumberOfPages, currentPageNumber) => seen.push({progress, currentPageNumber}),
            [{name: "Individual", syncWeight: 5}, {name: "Encounter", syncWeight: 4}]);
        status.updateProgressSteps([metadataFor("Encounter")],
            [{entityName: "Encounter", entityTypeUuid: "et1"}, {entityName: "Encounter", entityTypeUuid: "et2"}]);
        getJSONTimed
            .mockResolvedValueOnce(sliceAnswer("individual", ["a"], true))
            .mockResolvedValueOnce(sliceAnswer("individual", ["b"], true))
            .mockResolvedValueOnce(sliceAnswer("individual", ["c"], false))
            .mockResolvedValueOnce(sliceAnswer("encounter", ["x"], false))
            .mockResolvedValueOnce(sliceAnswer("encounter", ["y"], false));
        const toBar = (entityName, totalNumberOfPages, currentPageNumber) => status.onComplete(entityName, totalNumberOfPages, currentPageNumber);
        const save = () => Promise.resolve();

        await pullClient().getAllForEntity(metadataFor("Individual", "st1"), save, _.noop, toBar, NOW, "device1");
        await pullClient().getAllForEntity(metadataFor("Encounter", "et1"), save, _.noop, toBar, NOW, "device1");
        await pullClient().getAllForEntity(metadataFor("Encounter", "et2"), save, _.noop, toBar, NOW, "device1");

        const values = seen.map(s => s.progress);
        assert.deepEqual(values, _.sortBy(values), "never backwards");
        assert.closeTo(_.last(values), (5 + 4) / 100, 1e-9, "each kind's whole weight, split across its types");
        assert.isTrue(seen.every(s => _.isUndefined(s.currentPageNumber)), "no batch number, so the label shows none");
        status.onSyncComplete();
        assert.equal(_.last(seen).progress, 1);
    });

    it("clears the batch number the step before left on the label before its first batch, without moving the bar", async () => {
        const seen = [];
        const status = new ProgressbarStatus((progress, totalNumberOfPages, currentPageNumber) => seen.push({progress, currentPageNumber}),
            [{name: "UserInfo", syncWeight: 1}, {name: "Individual", syncWeight: 5}]);
        status.onComplete("UserInfo", 1, 0);
        let atFirstRequest;
        getJSONTimed.mockImplementation((url) => {
            const page = Number(queryOf(url).page);
            if (page === 0) atFirstRequest = _.last(seen);
            return Promise.resolve(sliceAnswer("individual", [`r${page}`], page < 1));
        });

        await pullClient().getAllForEntity(metadataFor("Individual", "st1"), () => Promise.resolve(), _.noop,
            (entityName, totalNumberOfPages, currentPageNumber) => status.onComplete(entityName, totalNumberOfPages, currentPageNumber),
            NOW, "device1");

        assert.isUndefined(atFirstRequest.currentPageNumber, "the user-info pull's (1/1) is gone while subjects download");
        assert.closeTo(atFirstRequest.progress, 1 / 100, 1e-9, "clearing the label does not move the bar");
        assert.closeTo(_.last(seen).progress, (1 + 5) / 100, 1e-9, "the kind's whole weight still arrives after its last batch");
    });
});

describe("ConventionalRestClient: what the no-count change leaves alone", () => {
    beforeEach(() => {
        getJSONTimed.mockReset();
        postTimed.mockReset();
    });

    it("reset sync keeps its counting pull: pages by the total, reports it, and moves the bar per page", async () => {
        getJSONTimed
            .mockResolvedValueOnce({body: {_embedded: {resetSyncs: [{uuid: "r1"}]}, page: {totalPages: 2, number: 0, totalElements: 2}}, timings: {}})
            .mockResolvedValueOnce({body: {_embedded: {resetSyncs: [{uuid: "r2"}]}, page: {totalPages: 2, number: 1, totalElements: 2}}, timings: {}});
        const onGetOfFirstPage = jest.fn();
        const bar = [];

        await pullClient().getAllForEntity(metadataFor("ResetSync"), () => Promise.resolve(), onGetOfFirstPage,
            (entityName, totalNumberOfPages, currentPageNumber) => bar.push([entityName, totalNumberOfPages, currentPageNumber]),
            NOW, "device1");

        const urls = getJSONTimed.mock.calls.map(([url]) => url);
        assert.match(urls[0], /^http:\/\/server\/resetSyncs\?/);
        assert.deepEqual(urls.map(url => queryOf(url).page), ["0", "1"]);
        assert.equal(onGetOfFirstPage.mock.calls[0][1].totalElements, 2);
        assert.deepEqual(bar, [["ResetSync", 2, 0], ["ResetSync", 2, 1]]);
    });

    it("user info stays on /v2/me", async () => {
        getJSONTimed.mockResolvedValueOnce({body: {_embedded: {userInfo: [{uuid: "u"}]}, page: {totalPages: 1, number: 0, totalElements: 1}}, timings: {}});

        await pullClient().getAllForEntity(metadataFor("UserInfo"), () => Promise.resolve(), _.noop, _.noop, NOW, "device1");

        assert.match(getJSONTimed.mock.calls[0][0], /^http:\/\/server\/v2\/me\?/);
    });

    // Push addresses as they stand; the no-count pull must not move any of them.
    const pushAddressToday = {
        SubjectMigration: "/subjectMigrationss",
        UserSubjectAssignment: "/userSubjectAssignments",
        Task: "/tasks",
        TaskUnAssignment: "/taskUnAssignmentss",
        SubjectProgramEligibility: "/subjectProgramEligibility",
        News: "/newss",
        GroupSubject: "/groupSubjects",
        Comment: "/comments",
        CommentThread: "/commentThreads",
        SubjectEntityApprovalStatus: "/entityApprovalStatus",
        EncounterEntityApprovalStatus: "/entityApprovalStatus",
        ProgramEncounterEntityApprovalStatus: "/entityApprovalStatus",
        ProgramEnrolmentEntityApprovalStatus: "/entityApprovalStatus",
        ChecklistItemEntityApprovalStatus: "/entityApprovalStatus",
        IndividualRelationship: "/individualRelationships",
        ChecklistItem: "/txNewChecklistItemEntitys",
        Checklist: "/txNewChecklistEntitys",
        AttendanceRecord: "/attendanceRecord",
        Session: "/session",
        Encounter: "/encounters",
        IdentifierAssignment: "/identifierAssignments",
        ProgramEncounter: "/programEncounters",
        ProgramEnrolment: "/programEnrolments",
        Individual: "/individuals",
    };

    it("sends every kind that moved to the no-count pull to the same address as before", async () => {
        postTimed.mockImplementation(() => Promise.resolve({}));
        const client = pullClient();

        for (const [entityName, address] of _.toPairs(pushAddressToday)) {
            postTimed.mockClear();
            const metaData = _.find(EntityMetaData.model(), m => m.entityName === entityName);
            await client.postAllEntities([{metaData, entities: [{resource: {uuid: "u1"}}]}], () => () => Promise.resolve(), _.noop);
            assert.equal(postTimed.mock.calls[0][0], `http://server${address}`, entityName);
        }
    });
});
