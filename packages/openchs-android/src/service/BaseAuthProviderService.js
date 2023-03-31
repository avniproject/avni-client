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
        const settings = await this.getAuthSettings();
        let newSettings = settings.clone();
        newSettings.userId = userId;
        this.settingsService.saveOrUpdate(newSettings);
        return newSettings;
    }

    async getAuthSettings() {
        return this.settingsService.getSettings();
    }

    async getUserName() {
        const settings = await this.getAuthSettings();
        return settings.userId;
    }

    isJWTTokenExpired(token) {
        return jwt_decode(token).exp < Date.now().valueOf() / 1000;
    }

}

export const IDP_PROVIDERS = {
    COGNITO: 'cognito',
    KEYCLOAK: 'keycloak',
    BOTH: 'both',
    NONE: 'none'
}

export default BaseAuthProviderService;