import AuthService from "../service/AuthService";
import General from "../utility/General";
import {ValidationResult, Concept} from 'avni-models';
import UserInfoService from "../service/UserInfoService";
import _ from 'lodash';
import {firebaseEvents, logEvent} from "../utility/Analytics";
import BackupRestoreRealmService from "../service/BackupRestoreRealm";
import EntityService from "../service/EntityService";

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
            dumpRestoreProgress: 0,
            dumpRestoreMessage: null
        };
    }

    static onLoad(state, action, context) {
        const userInfo = context.get(UserInfoService).getUserInfo();
        return _.assignIn({}, state, userInfo ? {userId: userInfo.username, loggedInUser: userInfo.username, dumpRestoreProgress: null} : {dumpRestoreProgress: null, dumpRestoreMessage: null});
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
                    action.cb(0, "Login successful, checking for prepared database");
                    return;
                }
                if (response.status === "NEWPASSWORD_REQUIRED") {
                    action.newPasswordRequired(response.user);
                    return;
                }
                General.logError("Unreachable code");
            }, (error) => {
                General.logError("LoginActions", error);
                const errorMsg = _.includes(error.message, "Network request failed") ? error.message.concat('. Network is slow or disconnected. Please check internet connection') : error.authErrCode;
                logEvent(firebaseEvents.LOG_IN_ERROR, {error_message: errorMsg});
                action.failure(errorMsg);
            })
            .then(() => {
                let entityService = context.get(EntityService);
                let entityTypeWhichWouldHaveAtLeastOneEntityInAllImplementationsAndIsQuiteEarlyInSyncCycle = Concept;
                let anEntity = entityService.findOnly(entityTypeWhichWouldHaveAtLeastOneEntityInAllImplementationsAndIsQuiteEarlyInSyncCycle.schema.name);
                return _.isEmpty(anEntity);
            })
            .then((doRestoreDump) => {
                if (doRestoreDump) {
                    let restoreService = context.get(BackupRestoreRealmService);
                    restoreService.restore((percentProgress, message) => {
                        if (percentProgress === 100) action.successCb();
                        else action.cb(percentProgress, message);
                    });
                } else {
                    action.successCb();
                }
            });
        return newState;
    }

    static onStateChange(state, action, context) {
        return _.assignIn({}, state, action.newState);
    }

    static onToggleShowPassword(state) {
        return _.assignIn({}, state, {showPassword: !state.showPassword})
    }

    static onEmptyLogin(state) {
        return _.assignIn({}, state, {loginError: 'Please fill in User Id and Password'});
    }

    static onDumpRestoring(state, action) {
        let newState = _.assignIn({}, state, {loggingIn: false, loginError: "", dumpRestoreProgress: action.percentProgress, dumpRestoreMessage: action.message});
        newState.dumpRestoring = action.percentProgress !== 100;
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
    ON_DUMP_RESTORING: 'LA.ON_DUMP_RESTORING'
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
]);

export {LoginActionsNames, LoginActionsMap, LoginActions} ;
