import {Settings} from "openchs-models";
import General from "../../../src/utility/General";
import TestLocaleMappingFactory from "../TestLocaleMappingFactory";

class TestSettingsFactory {
    static createWithDefaults({logLevel = General.LogLevel.Debug, pageSize = 20, localeMapping = TestLocaleMappingFactory.createWithDefaults({})}) {
        const settings = new Settings();
        settings.uuid = General.randomUUID();
        settings.serverURL = "http://localhost:8021";
        settings.locale = localeMapping;
        settings.logLevel = logLevel;
        settings.pageSize = pageSize;
        settings.poolId = settings.clientId = "dummy";
        return settings;
    }
}

export default TestSettingsFactory;
