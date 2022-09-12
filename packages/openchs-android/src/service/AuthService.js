import {AuthenticationDetails, CognitoUser, CognitoUserPool} from 'amazon-cognito-identity-js';
import Service from "../framework/bean/Service";
import BaseService from "./BaseService";
import SettingsService from "./SettingsService";
import _ from "lodash";
import {getJSON} from '../framework/http/requests';
import AuthenticationError, {NO_USER} from "./AuthenticationError";
import General from "../utility/General";
import ErrorHandler from "../utility/ErrorHandler";
import UserInfoService from "./UserInfoService";

@Service("authService")
class AuthService extends BaseService {
    constructor(db, context) {
        super(db, context);
    }

    init() {
        this.settingsService = this.getService(SettingsService);
        this.userInfoService = this.getService(UserInfoService);
    }

    authenticate(userId, password) {
        let settingsService = this.settingsService;
        const authenticateAndUpdateUserSettings = (userId, password, settings) => {
            ErrorHandler.setUser(userId);
            return this._authenticate(userId, password, settings);
        };

        return Promise.resolve(settingsService.getSettings())
            .then(() => this._updateCognitoPoolSettingsFromServer(userId))
            .then((settings) => this._authIsStubbed(settings) ? {status: "LOGIN_SUCCESS"} : authenticateAndUpdateUserSettings(userId.trim(), password, settings));
    }

    getAuthToken() {
        return this._getSettings().then((settings) => {
            return new Promise((resolve, reject) => {
                if (this._authIsStubbed(settings)) {
                    resolve(settings.userId);
                    return;
                }

                this.getUser().then((cognitoUser) => {
                    if (cognitoUser === null) {
                        reject(new AuthenticationError(NO_USER, "No user or needs login"));
                        return;
                    }

                    cognitoUser.getSession(function (err, session) {
                        if (err) {
                            General.logWarn("AuthService", err);
                            reject(new AuthenticationError(err.code, err.message));
                            return;
                        } else {
                            const jwtToken = session.getIdToken().getJwtToken();
                            resolve(jwtToken);
                            return;
                        }
                    });
                });
            });
        });
    }

    getUser() {
        return this._getSettings().then((settings) => {
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

    getStubbedUser() {
        const userInfo = this.userInfoService.getUserInfo();
        return userInfo.username;
    }

    userExists() {
        return new Promise((resolve) => {
            const settings = this.settingsService.getSettings();

            if (this._authIsStubbed(settings)) {
                General.logDebug("AuthService", "User is stubbed");
                resolve(true);
                return;
            }

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
        return this._getSettings().then((settings) => {
            return new Promise((resolve) => {
                if (this._authIsStubbed(settings)) {
                    resolve();
                    return;
                }

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
        return this._getSettings().then((settings) => {
            return new Promise((resolve, reject) => {
                const cognitoUser = AuthService._createCognitoUser(settings, userId.trim());
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

    _getSettings() {
        const settings = this.settingsService.getSettings();
        if (this._authParametersAbsent(settings)) {
            return this._updateCognitoPoolSettingsFromServer().then((updatedSettings) => updatedSettings);
        }
        return Promise.resolve(settings);
    }

    _updateCognitoPoolSettingsFromServer(userId) {
        const settings = this.settingsService.getSettings();
        const serverURL = settings.serverURL;
        const url = `${serverURL}/cognito-details`;
        return getJSON(url, true).then((authDetails) => {
            let newSettings = settings.clone();
            newSettings.poolId = authDetails.poolId;
            newSettings.clientId = authDetails.clientId;
            newSettings.userId = userId;
            this.settingsService.saveOrUpdate(newSettings);
            return newSettings;
        });
    }

    _authIsStubbed(settings) {
        return settings.clientId === 'dummy';
    }

    _authParametersAbsent(settings) {
        return _.some([settings.poolId, settings.clientId], _.isEmpty);
    }

    _authenticate(userId, password, settings) {
        const NEWPASSWORD_REQUIRED = "NEWPASSWORD_REQUIRED", LOGIN_SUCCESS = "LOGIN_SUCCESS";

        const authenticationDetails = new AuthenticationDetails({Username: userId, Password: password});
        const cognitoUser = AuthService._createCognitoUser(settings, userId);
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

    static _createCognitoUser(settings, userId) {
        const userPool = new CognitoUserPool({UserPoolId: settings.poolId, ClientId: settings.clientId});
        return new CognitoUser({Username: userId, Pool: userPool});
    }
}

export default AuthService;
