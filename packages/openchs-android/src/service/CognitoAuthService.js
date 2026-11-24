import {AuthenticationDetails, CognitoUser, CognitoUserPool} from 'amazon-cognito-identity-js';
import Service from "../framework/bean/Service";
import SettingsService from "./SettingsService";
import _ from "lodash";
import AuthenticationError, {authErrCodeFromCognitoError, NO_USER} from "./AuthenticationError";
import General from "../utility/General";
import UserInfoService from "./UserInfoService";
import BaseAuthProviderService from "./BaseAuthProviderService";
import bugsnag from "../utility/bugsnag";
import jwt_decode from "jwt-decode";
import SessionRecord from "./SessionRecord";

@Service("cognitoAuthService")
class CognitoAuthService extends BaseAuthProviderService {
    constructor(db, context) {
        super(db, context);
    }

    init() {
        this.settingsService = this.getService(SettingsService);
        this.userInfoService = this.getService(UserInfoService);
    }

    authenticate(userId, password) {
        const authenticateAndUpdateUserSettings = (userId, password, settings) => {
            bugsnag.setUser(userId, userId, userId);
            return this._authenticate(userId, password, settings);
        };

        return Promise.resolve(this.getAuthSettings())
            .then(() => super.persistUserId(userId))
            .then((settings) => authenticateAndUpdateUserSettings(userId.trim(), password, settings));
    }

    getAuthToken() {
        return Promise.resolve().then(() => {
            return new Promise((resolve, reject) => {
                this.getUser().then((cognitoUser) => {
                    if (cognitoUser === null) {
                        reject(new AuthenticationError(NO_USER, "No user or needs login"));
                        return;
                    }

                    cognitoUser.getSession((err, session) => {
                        if (err) {
                            General.logWarn("CognitoAuthService", err);
                            reject(new AuthenticationError(authErrCodeFromCognitoError(err), err.message));
                        } else {
                            const jwtToken = session.getIdToken().getJwtToken();
                            General.logInfo("CognitoAuthService", "Found token");
                            this._recordSessionClock(session);
                            resolve(jwtToken);
                        }
                    });
                });
            });
        });
    }

    _recordSessionClock(session) {
        const tokenIssuedAt = session.getIdToken().getIssuedAt() * 1000;
        if (tokenIssuedAt === this._recordedTokenIssuedAt) return;
        this._recordedTokenIssuedAt = tokenIssuedAt;
        SessionRecord.recordClock({tokenIssuedAt, clockDriftSeconds: session.getClockDrift()});
    }

    _userPool() {
        const settings = this.getAuthSettings();
        return new CognitoUserPool({UserPoolId: settings.poolId, ClientId: settings.clientId});
    }

    getCachedSessionClockInfo() {
        let storage, keyPrefix;
        try {
            const clientId = this.getAuthSettings().clientId;
            storage = this._userPool().storage;
            const username = storage.getItem(`CognitoIdentityServiceProvider.${clientId}.LastAuthUser`);
            if (_.isNil(username)) return {};
            keyPrefix = `CognitoIdentityServiceProvider.${clientId}.${username}`;
        } catch (e) {
            General.logWarn("CognitoAuthService", `Could not read cached session: ${e.message}`);
            return {};
        }
        const drift = parseInt(storage.getItem(`${keyPrefix}.clockDrift`), 10);
        return {
            clockDriftSeconds: _.isFinite(drift) ? drift : undefined,
            tokenIssuedAt: this._cachedTokenIssuedAt(storage.getItem(`${keyPrefix}.idToken`))
        };
    }

    _cachedTokenIssuedAt(idToken) {
        if (_.isNil(idToken)) return undefined;
        try {
            const issuedAt = _.get(jwt_decode(idToken), 'iat');
            return _.isFinite(issuedAt) ? issuedAt * 1000 : undefined;
        } catch (e) {
            General.logWarn("CognitoAuthService", `Could not decode cached ID token: ${e.message}`);
            return undefined;
        }
    }

    getUser() {
        return Promise.resolve().then(() => {
            return new Promise((resolve) => {
                const userPool = this._userPool();
                let user = userPool.getCurrentUser();
                if (user !== null) {
                    resolve(user);
                    return;
                }

                //Try syncing from local storage if not readily available
                userPool.storage.sync((error) => {
                    if (error) {
                        General.logDebug("CognitoAuthService", "Could not sync memory storage from AsyncStorage. Ignoring. ")
                        resolve(null);
                        return;
                    }
                    resolve(userPool.getCurrentUser());
                    return;
                });
            });
        });
    }

    getUserName() {
        return this.getAuthToken().then(
            () => this.getUser().then(user => user.getUsername(), _.noop),
            _.noop)
    }

    userExists() {
        return new Promise((resolve) => {
            const settings = this.getAuthSettings();

            //Fail fast. Do not do round trip server requests if settings is absent
            if (this._authParametersAbsent(settings)) {
                General.logDebug("CognitoAuthService", "Auth parameters are missing");
                resolve(false);
                return;
            }

            return this.getUser().then((user) => {
                resolve(user !== null);
                return;
            });
        });
    }

    logout() {
        return Promise.resolve().then(() => {
            return new Promise((resolve) => {
                this.getUser().then((user) => {
                    if (user === null) {
                        resolve();
                        return;
                    }
                    user.signOut();
                    resolve();
                    return;
                });
            });
        });
    }

    verifyOtpAndSetPassword(cognitoUser, verificationCode, newPassword) {
        return new Promise((resolve, reject) => {
            cognitoUser.confirmPassword(verificationCode, newPassword, {
                onSuccess() {
                    resolve();
                },
                onFailure(err) {
                    reject(err);
                }
            });
        });
    }

    forgotPassword(userId) {
        const settings = this.getAuthSettings()
        return Promise.resolve().then(() => {
            return new Promise((resolve, reject) => {
                const cognitoUser = this._createCognitoUser(settings, userId.trim());
                cognitoUser.forgotPassword({
                    onSuccess: function (data) {
                        return resolve({status: "SUCCESS", data: data});
                    },
                    onFailure: function (err) {
                        reject(err);
                    },
                    inputVerificationCode: function (data) {
                        return resolve({status: "INPUT_VERIFICATION_CODE", data: data, user: cognitoUser});
                    }
                });
            });
        });
    }

    completeNewPasswordChallenge(cognitoUser, password) {
        return new Promise((resolve, reject) => {
            cognitoUser.completeNewPasswordChallenge(password, {}, {
                onSuccess: function () {
                    resolve();
                    return;
                },
                onFailure: function (err) {
                    reject(err);
                    return;
                }
            });
        });
    }

    changePassword(oldPassword, newPassword) {
        const settings = this.settingsService.getSettings();
        return this.getUser()
            .then((user) => this._authenticate(user.getUsername(), oldPassword, settings))
            .then((result) => {
                const cognitoUser = result.user;
                return new Promise((resolve, reject) => {
                    cognitoUser.changePassword(oldPassword, newPassword, (err) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve();
                        }

                    });
                });
            });
    }

    _authParametersAbsent(settings) {
        return _.some([settings.poolId, settings.clientId], _.isEmpty);
    }

    _authenticate(userId, password, settings) {
        const NEWPASSWORD_REQUIRED = "NEWPASSWORD_REQUIRED", LOGIN_SUCCESS = "LOGIN_SUCCESS";

        const authenticationDetails = new AuthenticationDetails({Username: userId, Password: password});
        const cognitoUser = this._createCognitoUser(settings, userId);
        General.logDebug('AuthService.Authenticating', cognitoUser);
        return new Promise((resolve, reject) => {
            cognitoUser.authenticateUser(authenticationDetails, {
                onSuccess: function (session) {
                    resolve({status: LOGIN_SUCCESS, token: session.getIdToken().getJwtToken(), user: cognitoUser});
                },

                onFailure: function (err) {
                    reject(new AuthenticationError('Authentication failure', err));
                },

                newPasswordRequired: function () {
                    resolve({status: NEWPASSWORD_REQUIRED, user: cognitoUser});
                }
            });
        });
    }

    _createCognitoUser(settings, userId) {
        const userPool = new CognitoUserPool({UserPoolId: settings.poolId, ClientId: settings.clientId});
        return new CognitoUser({Username: userId, Pool: userPool});
    }
}

export default CognitoAuthService;
