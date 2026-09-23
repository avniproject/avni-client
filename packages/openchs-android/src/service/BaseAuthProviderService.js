import Service from "../framework/bean/Service";
import BaseService from "./BaseService";
import SettingsService from "./SettingsService";
import AuthService from "./AuthService";
import jwt_decode from "jwt-decode";

@Service("baseAuthProviderService")
class BaseAuthProviderService extends BaseService {
    constructor(db, context) {
        super(db, context);
    }

    init() {
        this.settingsService = this.getService(SettingsService);
        this.authService = this.getService(AuthService);
    }

    async authenticate(userId, password) {
        throw new Error("Should be overridden");
    }

    async userExists() {
        throw new Error("Should be overridden");
    }

    async getAuthToken() {
        throw new Error("Should be overridden");
    }

    async changePassword() {
        throw new Error("Should be overridden");
    }

    async logout() {
        throw new Error("Should be overridden");
    }

    async persistUserId(userId) {
        const settings = this.getAuthSettings();
        let newSettings = settings.clone();
        newSettings.userId = userId;
        this.settingsService.saveOrUpdate(newSettings);
        return newSettings;
    }

    getAuthSettings() {
        return this.settingsService.getSettings();
    }

    // Providers that cache a session locally override this. Nothing here is required for the app
    // to work; it only tells a device clock that moved after login from a session that really ended.
    getCachedSessionClockInfo() {
        return {};
    }

    async getUserName() {
        const settings = this.getAuthSettings();
        return settings.userId;
    }

    isJWTTokenExpired(token) {
        return jwt_decode(token).exp < Date.now().valueOf() / 1000;
    }
}

export default BaseAuthProviderService;
