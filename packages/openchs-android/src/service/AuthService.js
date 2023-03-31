import Service from "../framework/bean/Service";
import BaseService from "./BaseService";
import SettingsService from "./SettingsService";
import _ from "lodash";
import {getJSON} from '../framework/http/requests';
import UserInfoService from "./UserInfoService";
import StubbedAuthService from "./StubbedAuthService";
import CognitoAuthService from "./CognitoAuthService";
import KeycloakAuthService from "./KeycloakAuthService";
import { IDP_PROVIDERS } from "./BaseAuthProviderService";

@Service("authService")
class AuthService extends BaseService {
    constructor(db, context) {
        super(db, context);
    }

    init() {
        this.settingsService = this.getService(SettingsService);
        this.userInfoService = this.getService(UserInfoService);
        this.stubbedAuthService = this.getService(StubbedAuthService);
        this.keycloakAuthService = this.getService(KeycloakAuthService);
        this.cognitoAuthService = this.getService(CognitoAuthService);
    }
    _updateCognitoSettings(cognitoSettings) {
        return {
          poolId: cognitoSettings.poolId,
          clientId: cognitoSettings.clientId
        }
    }
    _updateKeycloakSettings( keycloakSettings ) {
        return {
            keycloakAuthServerUrl: keycloakSettings.authServerUrl,
            keycloakClientId: keycloakSettings.clientId,
            keycloakRealm: keycloakSettings.realm,
            keycloakScope: keycloakSettings.scope,
            keycloakGrantType: keycloakSettings.grantType,
        }
    }

    async fetchAuthSettingsFromServer() {
        const settings = this.settingsService.getSettings();
        const serverURL = settings.serverURL;
        const url = `${serverURL}/idp-details`;
        return getJSON(url, true).then(( authDetails ) => {
            let newSettings = settings.clone();
            newSettings.idpType = authDetails.idpType;
            newSettings = _.merge(newSettings, this._updateCognitoSettings(authDetails.cognito));
            newSettings = _.merge(newSettings, this._updateKeycloakSettings(authDetails.keycloak));
            this.settingsService.saveOrUpdate(newSettings);
            return newSettings;
        });
    }

    async isAuthInitialized() {
        const settings = await this.settingsService.getSettings();
        return !_.isNil(settings.idpType);
    }

    getAuthProviderService(userSelectedIdp) {
        const settings = this.settingsService.getSettings();
        const idpType = settings.idpType;

        switch (idpType) {
            case IDP_PROVIDERS.NONE:
                return this.stubbedAuthService;
            case IDP_PROVIDERS.KEYCLOAK:
                return this.keycloakAuthService;
            case IDP_PROVIDERS.BOTH:
                if (userSelectedIdp) {
                    const newSettings = settings.clone();
                    newSettings.idpType = userSelectedIdp;
                    this.settingsService.saveOrUpdate(newSettings);
                }
                return userSelectedIdp === IDP_PROVIDERS.KEYCLOAK ? this.keycloakAuthService : this.cognitoAuthService;
            case IDP_PROVIDERS.COGNITO:
                return this.cognitoAuthService;
            default:
                throw new Error(`Unsupported idpType: ${idpType}`);
        }
    }
}

export default AuthService;
