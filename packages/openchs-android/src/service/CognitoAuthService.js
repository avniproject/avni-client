import {AuthenticationDetails, CognitoUser, CognitoUserPool} from 'amazon-cognito-identity-js';
import Service from "../framework/bean/Service";
import SettingsService from "./SettingsService";
import _ from "lodash";
import AuthenticationError, {NO_USER} from "./AuthenticationError";
import General from "../utility/General";
import ErrorHandler from "../utility/ErrorHandler";
import UserInfoService from "./UserInfoService";
import AuthService from "./AuthService";
import BaseAuthProviderService from "./BaseAuthProviderService";

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
            ErrorHandler.setUser(userId);
            return this._authenticate(userId, password, settings);
        };

        return Promise.resolve(this.getAuthSettings())
            .then(() => super.persistUserId(userId))
            .then((settings) => authenticateAndUpdateUserSettings(userId.trim(), password, settings));
    }

    getAuthToken() {
        return this.getAuthSettings().then((settings) => {
            return new Promise((resolve, reject) => {

                this.getUser().then((cognitoUser) => {
                    if (cognitoUser === null) {
                        reject(new AuthenticationError(NO_USER, "No user or needs login"));
                        return;
                    }

                    cognitoUser.getSession(function (err, session) {
                        if (err) {
                            General.logWarn("AuthService", err);
                            reject(new AuthenticationError(err.code, err.message));
                        } else {
                            const jwtToken = session.getIdToken().getJwtToken();
                            General.logInfo("AuthService", "Found token");
                            resolve(jwtToken);
                        }
                    });
                });
            });
        });
    }

    getUser() {
        return this.getAuthSettings().then((settings) => {
            return new Promise((resolve) => {
                const userPool = new CognitoUserPool({UserPoolId: settings.poolId, ClientId: settings.clientId});
                let user = userPool.getCurrentUser();
                if (user !== null) {
                    resolve(user);
                    return;
                }

                //Try syncing from local storage if not readily available
                userPool.storage.sync((error) => {
                    if (error) {
                        General.logDebug("AuthService", "Could not sync memory storage from AsyncStorage. Ignoring. ")
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
                General.logDebug("AuthService", "Auth parameters are missing");
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
        return this.getAuthSettings().then((settings) => {
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
        return this.getAuthSettings().then((settings) => {
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
