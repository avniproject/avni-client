import AuthService from "../../src/service/AuthService";
import SessionRecord from "../../src/service/SessionRecord";
import AsyncStorage from "@react-native-async-storage/async-storage";

describe("AuthService.logout", () => {
    const withProvider = (logout) => {
        const authService = Object.create(AuthService.prototype);
        authService.getAuthProviderService = () => ({logout});
        return authService;
    };

    beforeEach(async () => {
        await AsyncStorage.clear();
        await SessionRecord.established();
    });

    it("ends the session record, so the next launch is not counted as a forced logout", async () => {
        await withProvider(() => Promise.resolve()).logout();
        expect(await SessionRecord.getState()).toBe("ended");
    });

    it("ends it even when the provider's sign-out fails", async () => {
        await expect(withProvider(() => Promise.reject(new Error("offline"))).logout()).rejects.toThrow("offline");
        expect(await SessionRecord.getState()).toBe("ended");
    });
});
