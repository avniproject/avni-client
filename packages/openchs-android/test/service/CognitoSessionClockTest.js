// AuthService first: BaseAuthProviderService and AuthService import each other, and this order resolves the cycle.
import "../../src/service/AuthService";
import CognitoAuthService from "../../src/service/CognitoAuthService";
import SessionRecord from "../../src/service/SessionRecord";
import AsyncStorage from "@react-native-async-storage/async-storage";

describe("CognitoAuthService saving the session clock", () => {
    const session = (issuedAtSeconds, clockDrift) => ({
        getIdToken: () => ({getIssuedAt: () => issuedAtSeconds}),
        getClockDrift: () => clockDrift
    });
    const service = () => Object.create(CognitoAuthService.prototype);
    const settle = () => new Promise(setImmediate);

    beforeEach(() => AsyncStorage.clear());

    it("saves the token's issue time and the drift, for the event after the SDK deletes its copy", async () => {
        service()._recordSessionClock(session(1_700_000_000, -4));
        await settle();
        expect(await SessionRecord.getClock()).toEqual({tokenIssuedAt: 1_700_000_000_000, clockDriftSeconds: -4});
    });

    it("writes only when the token changes, not on every request", async () => {
        const cognito = service();
        cognito._recordSessionClock(session(1_700_000_000, -4));
        await settle();
        AsyncStorage.setItem.mockClear();
        cognito._recordSessionClock(session(1_700_000_000, -4));
        cognito._recordSessionClock(session(1_700_003_600, 2));
        await settle();
        expect(AsyncStorage.setItem).toHaveBeenCalledTimes(1);
        expect(await SessionRecord.getClock()).toEqual({tokenIssuedAt: 1_700_003_600_000, clockDriftSeconds: 2});
    });
});
