import SettingsService from "../service/SettingsService";
import _ from 'lodash';
import EntityService from "../service/EntityService";
import {LocaleMapping, Settings} from 'openchs-models';
import General from "../utility/General";
import MessageService from "../service/MessageService";
import UserInfoService from '../service/UserInfoService';

class SettingsActions {
    static getInitialState(context) {
        const settings = context.get(SettingsService).getSettings();
        const userInfo = context.get(UserInfoService).getUserInfo();
        const localeMappings = context.get(EntityService).getAll(LocaleMapping.schema.name);
        const validationResults = settings.validate();
        const serverURL = settings.serverURL;
        return {
            settings: settings,
            localeMappings: localeMappings,
            validationResults: validationResults,
            userInfo: userInfo,
            serverURL: serverURL,
            advancedMode: false,
            rulesToRun: []
        };
    }

    static clone(state) {
        return {
            settings: state.settings.clone(),
            localeMappings: state.localeMappings,
            userInfo: state.userInfo.clone(),
            rulesToRun: []
        };
    }

    static _updateSettingAndSave(state, updateFunc, context) {
        const newState = SettingsActions.clone(state);
        updateFunc(newState.settings);
        newState.validationResults = newState.settings.validate();

        if (newState.validationResults.hasNoValidationError()) {
            context.get(SettingsService).saveOrUpdate(newState.settings, Settings.schema.name);
        }

        return newState;
    }

    static onServerURLChange(state, action, context) {
        return SettingsActions._updateSettingAndSave(state, (settings) => {
            settings.serverURL = action.value
        }, context);
    }

    static toNumber(str) {
        return General.isNumeric(str) ? _.toNumber(str) : str;
    }

    static onLocaleChange(state, action, context) {
        return SettingsActions._updateSettingAndSave(state, (settings) => {
            settings.locale = action.value;
            context.get(MessageService).setLocale(settings.locale.locale);
        }, context);
    }

    static onLogLevelChange(state, action, context) {
        return SettingsActions._updateSettingAndSave(state, (settings) => {
            settings.logLevel = _.toNumber(action.value)
        }, context);
    }

    static onAdvancedMode(state, action, context) {
        return {...state, advancedMode: !state.advancedMode};
    }

    static onCaptureLocationChange(state, action, context) {
        return SettingsActions._updateSettingAndSave(
            state,
            settings => {
                settings.captureLocation = !settings.captureLocation;
            },
            context
        );
    }

    static onRuleChange(state, action, context) {
        const ruleToAddRemove = action.value;
        let rulesToRun = state.rulesToRun;
        if (state.rulesToRun.indexOf(ruleToAddRemove) > -1) {
            rulesToRun = rulesToRun.filter(r => r !== ruleToAddRemove);
        } else {
            rulesToRun = rulesToRun.concat([ruleToAddRemove]);
        }
        return {...state, rulesToRun: rulesToRun};
    }
}

const SettingsActionsNames = {
    ON_SERVER_URL_CHANGE: 'S.ON_SERVER_URL_CHANGE',
    ON_LOCALE_CHANGE: 'S.ON_LOCALE_CHANGE',
    ON_LOG_LEVEL_CHANGE: 'S.ON_LOG_LEVEL_CHANGE',
    ON_ADVANCED_MODE: 'S.ON_ADVANCED_MODE',
    ON_RULE_CHANGE: 'S.ON_RULE_CHANGE',
    ON_CAPTURE_LOCATION_CHANGE: 'S.ON_CAPTURE_LOCATION_CHANGE'
};

const SettingsActionsMap = new Map([
    [SettingsActionsNames.ON_SERVER_URL_CHANGE, SettingsActions.onServerURLChange],
    [SettingsActionsNames.ON_LOCALE_CHANGE, SettingsActions.onLocaleChange],
    [SettingsActionsNames.ON_ADVANCED_MODE, SettingsActions.onAdvancedMode],
    [SettingsActionsNames.ON_LOG_LEVEL_CHANGE, SettingsActions.onLogLevelChange],
    [SettingsActionsNames.ON_RULE_CHANGE, SettingsActions.onRuleChange],
    [SettingsActionsNames.ON_CAPTURE_LOCATION_CHANGE, SettingsActions.onCaptureLocationChange]
]);

export {
    SettingsActionsNames,
    SettingsActionsMap,
    SettingsActions
};