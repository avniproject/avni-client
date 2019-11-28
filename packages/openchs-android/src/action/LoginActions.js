import AuthService from "../service/AuthService";
import General from "../utility/General";
import {ValidationResult} from 'avni-models';
import UserInfoService from "../service/UserInfoService";
import _ from 'lodash';

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
            validationResult: ValidationResult.successful()
        };
    }

    static onLoad(state, action, context) {
        const userInfo = context.get(UserInfoService).getUserInfo();
        return _.assignIn({}, state, userInfo ? {userId: userInfo.username, loggedInUser: userInfo.username} : {});
    }

    static changeValue(state, key, value) {
        let newValue = {};
        newValue[key] = value;
        return _.assignIn({}, state, newValue);
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
        context.get(AuthService)
            .authenticate(state.userId, state.password)
            .then((response) => {
                if (response.status === "LOGIN_SUCCESS") {
                    action.success();
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
                action.failure(errorMsg);
            });
        return _.assignIn({}, state, {loggingIn: true, loginError: '', loginSuccess: false});
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
}

const LoginActionsNames = {
    ON_USER_ID_CHANGE: 'ace85b4c-9d5b-4be9-b4df-998c1acc6919',
    ON_PASSWORD_CHANGE: '635c0815-91a6-4611-bd84-f1fa6ac441d2',
    ON_CANCEL: '75c1ab7a-c22d-47f0-80c1-cf71f990c47a',
    ON_LOGIN: 'ff805a17-8397-4a2a-ab13-e01117a8c113',
    ON_STATE_CHANGE: '3da34606-897a-43ac-b41f-0ef31abc7a01',
    ON_TOGGLE_SHOW_PASSWORD: "9afb6cdc-aa96-4377-b092-44b218c6d9af",
    ON_EMPTY_LOGIN: "e17aa8ec-b24b-43e5-bcc8-63f5234c04a3",
    ON_LOAD: '8c4b600f-f000-4b9b-80d2-423069bf52b7',
};

const LoginActionsMap = new Map([
    [LoginActionsNames.ON_USER_ID_CHANGE, LoginActions.onUserIdChange],
    [LoginActionsNames.ON_PASSWORD_CHANGE, LoginActions.onPasswordChange],
    [LoginActionsNames.ON_LOGIN, LoginActions.onLoginStarted],
    [LoginActionsNames.ON_STATE_CHANGE, LoginActions.onStateChange],
    [LoginActionsNames.ON_TOGGLE_SHOW_PASSWORD, LoginActions.onToggleShowPassword],
    [LoginActionsNames.ON_LOAD, LoginActions.onLoad],
    [LoginActionsNames.ON_EMPTY_LOGIN, LoginActions.onEmptyLogin],
]);

export {LoginActionsNames, LoginActionsMap, LoginActions} ;
