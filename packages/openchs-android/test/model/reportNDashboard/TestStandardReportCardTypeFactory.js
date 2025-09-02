import {StandardReportCardType} from 'openchs-models';
import General from "../../../src/utility/General";

class TestStandardReportCardTypeFactory {
    static create({name, uuid = General.randomUUID()}) {
        const standardReportCardType = new StandardReportCardType();
        standardReportCardType.uuid = uuid;
        standardReportCardType.name = name;
        standardReportCardType.type = name;
        standardReportCardType.d
        return standardReportCardType;
    }
}

export default TestStandardReportCardTypeFactory;
