import ValidationResult from "./application/ValidationResult";
import _ from "lodash";
import ValidationResults from "./application/ValidationResults";
import General from "./utility/General";

class Settings {
    static UUID = '2aa81079-38c3-4d9f-8380-f50544b32b3d';

    static schema = {
        name: 'Settings',
        primaryKey: 'uuid',
        properties: {
            uuid: 'string',
            serverURL: 'string',
            locale: {"type": "LocaleMapping"},
            logLevel: 'int',
            pageSize: 'int',
            poolId: 'string',
            clientId: 'string',
            devSkipValidation: {type: 'bool', default: false},
            captureLocation: {type: 'bool', default: true}
        }
    };

    clone() {
        const settings = new Settings();
        settings.uuid = this.uuid;
        settings.serverURL = this.serverURL;
        settings.locale = this.locale;
        settings.logLevel = this.logLevel;
        settings.poolId = this.poolId;
        settings.clientId = this.clientId;
        settings.pageSize = this.pageSize;
        settings.devSkipValidation = this.devSkipValidation;
        settings.captureLocation = this.captureLocation;
        return settings;
    }

    validate() {
        let validationResults = new ValidationResults([
            ValidationResult.successful('serverURL'),
            ValidationResult.successful('locale'),
            ValidationResult.successful('logLevel')]);

        if (_.isEmpty(this.serverURL)) validationResults.addOrReplace(ValidationResult.failureForEmpty("serverURL"));
        if (_.isEmpty(this.locale)) validationResults.addOrReplace(ValidationResult.failureForEmpty("locale"));
        if (!General.isNumeric(this.logLevel)) validationResults.addOrReplace(ValidationResult.failureForNumeric('logLevel'));

        return validationResults;
    }
}

export default Settings;