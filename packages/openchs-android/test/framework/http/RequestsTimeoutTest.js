import {assert} from "chai";

jest.mock("@react-native-cookies/cookies", () => ({get: jest.fn(() => Promise.resolve({}))}));

import {getJSON} from "../../../src/framework/http/requests";
import {SYNC_TIMEOUT_ERROR} from "../../../src/framework/errorHandling/ExpectedTransientNetworkError";

const SECOND = 1000;
// jest 28 has no advanceTimersByTimeAsync; a real setImmediate runs after every pending promise callback.
const flush = () => new Promise((resolve) => setImmediate(resolve));

function watch(promise) {
    const outcome = {state: "pending"};
    promise.then((value) => Object.assign(outcome, {state: "resolved", value}),
        (error) => Object.assign(outcome, {state: "rejected", error}));
    return outcome;
}

describe("requests: how long the phone waits for one request", () => {
    beforeEach(() => jest.useFakeTimers({doNotFake: ["setImmediate", "nextTick"]}));
    afterEach(() => jest.useRealTimers());

    it("reads a response that takes 90 s", async () => {
        global.fetch = jest.fn(() => new Promise((resolve) =>
            setTimeout(() => resolve({status: 200, json: () => Promise.resolve({ok: true})}), 90 * SECOND)));
        const outcome = watch(getJSON("http://server/slow", true));
        await flush();

        jest.advanceTimersByTime(90 * SECOND);
        await flush();

        assert.equal(outcome.state, "resolved", outcome.error && outcome.error.message);
        assert.deepEqual(outcome.value, {ok: true});
        assert.equal(jest.getTimerCount(), 0, "no timer left pending once the response is read");
    });

    it("gives up on a response that never comes at 180 s, not before", async () => {
        global.fetch = jest.fn(() => new Promise(() => {}));
        const outcome = watch(getJSON("http://server/hangs", true));
        await flush();

        jest.advanceTimersByTime(180 * SECOND - 1);
        await flush();
        assert.equal(outcome.state, "pending", "still waiting a millisecond before the limit");

        jest.advanceTimersByTime(1);
        await flush();
        assert.equal(outcome.state, "rejected");
        assert.equal(outcome.error.message, SYNC_TIMEOUT_ERROR);
    });
});
