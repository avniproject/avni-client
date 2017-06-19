import ValidationResult from "./application/ValidationResult";
import _ from "lodash";
import ValidationResults from "./application/ValidationResults";
class Settings {
    static UUID = '2aa81079-38c3-4d9f-8380-f50544b32b3d';

    static schema = {
        name: 'Settings',
        primaryKey: 'uuid',
        properties: {
            uuid: 'string',
            serverURL: 'string',
            catchment: 'int',
            locale: {"type": "LocaleMapping"},
            logLevel: 'int'
        }
    };

    clone() {
        const settings = new Settings();
        settings.uuid = this.uuid;
        settings.serverURL = this.serverURL;
        settings.catchment = this.catchment;
        settings.locale = this.locale;
        settings.logLevel = this.logLevel;
        return settings;
    }

    validate() {
        let validationResults = new ValidationResults([
            ValidationResult.successful('catchment'),
            ValidationResult.successful('serverURL'),
            ValidationResult.successful('locale'),
            ValidationResult.successful('logLevel')]);

        if (_.isEmpty(this.serverURL)) validationResults.addOrReplace(ValidationResult.failureForEmpty("serverURL"));
        if (isNaN(_.toNumber(this.catchment)))validationResults.addOrReplace(ValidationResult.failureForNumeric('catchment'));
        if (_.isEmpty(this.locale)) validationResults.addOrReplace(ValidationResult.failureForEmpty("locale"));
        if (isNaN(_.toNumber(this.logLevel))) validationResults.addOrReplace(ValidationResult.failureForNumeric('logLevel'));

        return validationResults;
    }
}

export default Settings;