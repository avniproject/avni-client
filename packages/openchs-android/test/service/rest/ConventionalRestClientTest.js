import {assert} from "chai";

jest.mock("../../../src/framework/http/requests", () => ({
    getJSON: jest.fn(),
    get: jest.fn(),
    post: jest.fn(),
}));

import {post} from "../../../src/framework/http/requests";
import ConventionalRestClient from "../../../src/service/rest/ConventionalRestClient";

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
        post.mockReset();
        client = new ConventionalRestClient(settingsService);
    });

    it("drops a failing RuleFailureTelemetry post and continues with remaining entities", async () => {
        post.mockImplementation((url, resource) =>
            resource.uuid === "t2" ? Promise.reject(new Error("500")) : Promise.resolve({}));
        const {popped, onCompleteOfIndividualPost} = trackPops();
        const telemetry = entitiesOfType("RuleFailureTelemetry", "ruleFailureTelemetry", ["t1", "t2", "t3"]);
        const individuals = entitiesOfType("Individual", "individual", ["i1"]);
        const completedTypes = [];

        await client.postAllEntities([telemetry, individuals], onCompleteOfIndividualPost,
            (entityName) => completedTypes.push(entityName));

        assert.deepEqual(popped, ["t1", "t2", "t3", "i1"], "failed telemetry must still be popped off the queue");
        assert.deepEqual(completedTypes, ["RuleFailureTelemetry", "Individual"], "push must proceed past the failure");
        assert.equal(post.mock.calls.length, 4);
    });

    it("aborts on failure of a non-best-effort entity without popping it", async () => {
        post.mockImplementation((url, resource) =>
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
