import SettingsService from "../service/SettingsService";
import _ from 'lodash';
import EntityService from "../service/EntityService";
import {LocaleMapping, Settings} from 'openchs-models';
import General from "../utility/General";
import MessageService from "../service/MessageService";

class SettingsActions {
    static getInitialState(context) {
        const settings = context.get(SettingsService).getSettings();
        const localeMappings = context.get(EntityService).getAll(LocaleMapping.schema.name);
        const validationResults = settings.validate();
        return {settings: settings, localeMappings: localeMappings, validationResults: validationResults};
    }

    static clone(state) {
        return {settings: state.settings.clone(), localeMappings: state.localeMappings};
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

    static onCatchmentChange(state, action, context) {
        return SettingsActions._updateSettingAndSave(state, (settings) => {
            settings.catchment = SettingsActions.toNumber(action.value)
        }, context);
    }

    static onLogLevelChange(state, action, context) {
        return SettingsActions._updateSettingAndSave(state, (settings) => {
            settings.logLevel = _.toNumber(action.value)
        }, context);
    }
}

const SettingsActionsNames = {
    ON_SERVER_URL_CHANGE: 'S.ON_SERVER_URL_CHANGE',
    ON_LOCALE_CHANGE: 'S.ON_LOCALE_CHANGE',
    ON_CATCHMENT_CHANGE: 'S.ON_CATCHMENT_CHANGE',
    ON_LOG_LEVEL_CHANGE: 'S.ON_LOG_LEVEL_CHANGE'
};

const SettingsActionsMap = new Map([
    [SettingsActionsNames.ON_SERVER_URL_CHANGE, SettingsActions.onServerURLChange],
    [SettingsActionsNames.ON_LOCALE_CHANGE, SettingsActions.onLocaleChange],
    [SettingsActionsNames.ON_CATCHMENT_CHANGE, SettingsActions.onCatchmentChange],
    [SettingsActionsNames.ON_LOG_LEVEL_CHANGE, SettingsActions.onLogLevelChange]
]);

export {
    SettingsActionsNames,
    SettingsActionsMap,
    SettingsActions
};