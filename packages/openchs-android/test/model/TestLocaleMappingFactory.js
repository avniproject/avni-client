import {LocaleMapping} from "openchs-models";
import General from "../../src/utility/General";

class TestLocaleMappingFactory {
    static createWithDefaults({locale = "en", displayText = "English"}) {
        const localeMapping = new LocaleMapping();
        localeMapping.uuid = General.randomUUID();
        localeMapping.locale = locale;
        localeMapping.displayText = displayText;
        return localeMapping;
    }
}

export default TestLocaleMappingFactory;
