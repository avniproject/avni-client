import {assert} from "chai";

jest.mock("@react-native-cookies/cookies", () => ({get: jest.fn(() => Promise.resolve({}))}));

import {getJSON} from "../../../src/framework/http/requests";
import AuthenticationError from "../../../src/service/AuthenticationError";
import ServerError from "../../../src/service/ServerError";

const reply = (status, body) => ({status, json: async () => body});

describe("requests: a refused request keeps the server's response", () => {
    [401, 403].forEach((status) => {
        it(`keeps it on a ${status}, as on any other refusal, so a caller can read why`, async () => {
            global.fetch = jest.fn(async () => reply(status, {code: "SOME_REASON"}));

            const error = await getJSON("http://server/refuses", true).catch((e) => e);

            assert.instanceOf(error, AuthenticationError);
            assert.equal(error.authErrCode, `Http ${status}`);
            assert.equal(error.response.status, status);
            assert.deepEqual(await error.response.json(), {code: "SOME_REASON"});
        });
    });

    it("already keeps it on a 409", async () => {
        global.fetch = jest.fn(async () => reply(409, {code: "SOME_REASON"}));

        const error = await getJSON("http://server/refuses", true).catch((e) => e);

        assert.instanceOf(error, ServerError);
        assert.deepEqual(await error.response.json(), {code: "SOME_REASON"});
    });
});
