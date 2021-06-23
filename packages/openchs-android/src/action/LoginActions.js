import AuthService from "../service/AuthService";
import General from "../utility/General";
import {ValidationResult} from 'avni-models';
import UserInfoService from "../service/UserInfoService";
import _ from 'lodash';
import {firebaseEvents, logEvent} from "../utility/Analytics";
import BackupRestoreRealmService from "../service/BackupRestoreRealm";

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
            dumpRestoreMessage: null
        };
    }

    static onLoad(state, action, context) {
        const userInfo = context.get(UserInfoService).getUserInfo();
        const newState = _.assignIn({}, state, userInfo ? {userId: userInfo.username, loggedInUser: userInfo.username, percentProgress: null} : {
            percentProgress: null,
            dumpRestoreMessage: null
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
        context.get(AuthService)
            .authenticate(state.userId, state.password)
            .then((response) => {
                if (response.status === "LOGIN_SUCCESS") {
                    logEvent(firebaseEvents.LOG_IN);
                    LoginActions.startDumpRestore(context, action, action.source);
                    return;
                }
                if (response.status === "NEWPASSWORD_REQUIRED") {
                    action.newPasswordRequired(response.user, (source) => LoginActions.startDumpRestore(context, action, source));
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

    static startDumpRestore(context, action, source) {
        action.onLoginProgress(0, "Login successful, checking for prepared database");
        let backupRestoreRealmService = context.get(BackupRestoreRealmService);
        const doRestoreDump = backupRestoreRealmService.isDatabaseNotSynced();
        General.logInfo("LoginActions", `Dump restore can be done = ${doRestoreDump}`);
        if (doRestoreDump) {
            LoginActions.restoreDump(context, action, source);
        } else {
            action.successCb(source);
        }
    }

    static restoreDump(context, action, source) {
        let restoreService = context.get(BackupRestoreRealmService);
        restoreService.restore((percentProgress, message, failed = false, failureMessage) => {
            if (failed) action.checkForRetry(failureMessage, source);
            else if (percentProgress === 100) action.successCb(source);
            else action.onLoginProgress(percentProgress, message);
        });
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
        LoginActions.restoreDump(context, action, action.source);
        return newState;
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
]);

export {LoginActionsNames, LoginActionsMap, LoginActions} ;
