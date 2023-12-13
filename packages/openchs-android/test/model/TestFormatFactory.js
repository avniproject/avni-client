import {Format} from "openchs-models";

class TestFormatFactory {
    static create(regex, descriptionKey) {
        const format = new Format();
        format.regex = regex;
        format.descriptionKey = descriptionKey;
        return format;
    }
}

export default TestFormatFactory;
