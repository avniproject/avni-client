import AuthService from "../service/AuthService";
import General from "../utility/General";
import { ValidationResult } from 'avni-models';
import UserInfoService from "../service/UserInfoService";
import _ from 'lodash';
import { firebaseEvents, logEvent } from "../utility/Analytics";
import BackupRestoreRealmService from "../service/BackupRestoreRealmService";
import SettingsService from "../service/SettingsService";
import { IDP_PROVIDERS } from "../model/IdpProviders";

function restoreDump(context, action, source, successCb) {
    const restoreService = context.get(BackupRestoreRealmService);
    restoreService.restore((percentProgress, message, failed = false, error) => {
        if (failed) action.checkForRetry(error, source);
        else if (percentProgress === 100) successCb(source);
        else action.onLoginProgress(percentProgress, message);
    });
}

class LoginActions {
    static getInitialState() {
        return {
            loggedInUser: '',
            userId: '',
            password: '',
            showPassword: false,
            loggingIn: false,
            loginError: '',
            loginSuccess: false,
            validationResult: ValidationResult.successful(),
            dumpRestoring: false,
            percentProgress: 0,
            dumpRestoreMessage: null,
            idpType: null,
            userSelectedIdp: IDP_PROVIDERS.COGNITO
        };
    }

    static onLoad(state, action, context) {
        const userInfo = context.get(UserInfoService).getUserInfo();
        const settings = context.get(SettingsService).getSettings();
        const newState = _.assignIn({}, state, userInfo ? {userId: userInfo.username, loggedInUser: userInfo.username, percentProgress: null, idpType: settings.idpType} : {
            percentProgress: null,
            dumpRestoreMessage: null,
            idpType: settings.idpType
        });
        newState.dumpRestoring = false;
        return newState;
    }

    static onUserIdChange(state, action) {
        const validationResult = /\s/.test(action.value) ? ValidationResult.failure('', 'Username is incorrect, please correct it') : ValidationResult.successful();
        return _.assignIn({}, state, {
            userId: action.value.trim(),
            validationResult: validationResult,
            loginError: ''
        });
    }

    static onPasswordChange(state, action) {
        return _.assignIn({}, state, {password: action.value, loginError: ''});
    }

    static onLoginStarted(state, action, context) {
        let newState = _.assignIn({}, state, {loggingIn: true, loginError: '', loginSuccess: false});
        context.get(AuthService).getAuthProviderService(state.idpType === IDP_PROVIDERS.BOTH ? state.userSelectedIdp : null)
            .authenticate(state.userId, state.password)
            .then((response) => {
                if (response.status === "LOGIN_SUCCESS") {
                    logEvent(firebaseEvents.LOG_IN);
                    LoginActions.startDumpRestore(context, action, action.source, action.successCb);
                    return;
                }
                if (response.status === "NEWPASSWORD_REQUIRED") {
                    action.newPasswordRequired(response.user, (source) => LoginActions.startDumpRestore(context, action, source, action.successCBFromSetPasswordView));
                    return;
                }
                General.logError("Unreachable code");
            }, (error) => {
                General.logError("LoginActions", error);
                const errorMsg = _.includes(error.message, "Network request failed") ? error.message.concat('. Network is slow or disconnected. Please check internet connection') : error.authErrCode;
                logEvent(firebaseEvents.LOG_IN_ERROR, {error_message: errorMsg});
                action.failure(errorMsg);
            });
        return newState;
    }

    static startDumpRestore(context, action, source, successCb) {
        action.onLoginProgress(0, "Login successful, checking for prepared database");
        let backupRestoreRealmService = context.get(BackupRestoreRealmService);
        const doRestoreDump = backupRestoreRealmService.isDatabaseNeverSynced();
        General.logInfo("LoginActions", `Dump restore can be done = ${doRestoreDump}`);
        if (doRestoreDump) {
            restoreDump(context, action, source, successCb);
        } else {
            successCb(source);
        }
    }

    static onStateChange(state, action) {
        return _.assignIn({}, state, action.newState);
    }

    static onToggleShowPassword(state) {
        return _.assignIn({}, state, {showPassword: !state.showPassword})
    }

    static onEmptyLogin(state) {
        return _.assignIn({}, state, {loginError: 'Please fill in User Id and Password'});
    }

    static onDumpRestoring(state, action) {
        let newState = _.assignIn({}, state, {loggingIn: false, loginError: "", percentProgress: action.percentProgress, dumpRestoreMessage: action.message});
        newState.dumpRestoring = action.percentProgress !== 100;
        return newState;
    }

    static onDumpRestoreRetry(state, action, context) {
        let newState = _.assignIn({}, state, {percentProgress: 0});
        //restore dump calls dispatch internally
        setTimeout(() => {
            restoreDump(context, action, action.source, action.successCb);
        }, 1);
        return newState;
    }

    static onUserToggleIdp(state) {
        return _.assignIn({}, state, {userSelectedIdp: state.userSelectedIdp === IDP_PROVIDERS.COGNITO ? IDP_PROVIDERS.KEYCLOAK: IDP_PROVIDERS.COGNITO});
    }
}

const LoginActionsNames = {
    ON_USER_ID_CHANGE: 'LA.ON_USER_ID_CHANGE',
    ON_PASSWORD_CHANGE: 'LA.ON_PASSWORD_CHANGE',
    ON_CANCEL: 'LA.ON_CANCEL',
    ON_LOGIN: 'LA.ON_LOGIN',
    ON_STATE_CHANGE: 'LA.ON_STATE_CHANGE',
    ON_TOGGLE_SHOW_PASSWORD: "LA.ON_TOGGLE_SHOW_PASSWORD",
    ON_EMPTY_LOGIN: "LA.ON_EMPTY_LOGIN",
    ON_LOAD: 'LA.ON_LOAD',
    ON_DUMP_RESTORING: 'LA.ON_DUMP_RESTORING',
    ON_DUMP_RESTORE_RETRY: 'LA.ON_DUMP_RESTORE_RETRY',
    ON_USER_TOGGLE_IDP: 'LA.ON_USER_TOGGLE_IDP',
};

const LoginActionsMap = new Map([
    [LoginActionsNames.ON_USER_ID_CHANGE, LoginActions.onUserIdChange],
    [LoginActionsNames.ON_PASSWORD_CHANGE, LoginActions.onPasswordChange],
    [LoginActionsNames.ON_LOGIN, LoginActions.onLoginStarted],
    [LoginActionsNames.ON_STATE_CHANGE, LoginActions.onStateChange],
    [LoginActionsNames.ON_TOGGLE_SHOW_PASSWORD, LoginActions.onToggleShowPassword],
    [LoginActionsNames.ON_LOAD, LoginActions.onLoad],
    [LoginActionsNames.ON_EMPTY_LOGIN, LoginActions.onEmptyLogin],
    [LoginActionsNames.ON_DUMP_RESTORING, LoginActions.onDumpRestoring],
    [LoginActionsNames.ON_DUMP_RESTORE_RETRY, LoginActions.onDumpRestoreRetry],
    [LoginActionsNames.ON_USER_TOGGLE_IDP, LoginActions.onUserToggleIdp],
]);

export {LoginActionsNames, LoginActionsMap, LoginActions} ;
