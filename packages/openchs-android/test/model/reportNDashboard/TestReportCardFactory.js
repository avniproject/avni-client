import {ReportCard} from 'openchs-models';
import General from "../../../src/utility/General";

class TestReportCardFactory {
    static create({uuid = General.randomUUID(), name, standardReportCardType, colour = "red"}) {
        const reportCard = new ReportCard();
        reportCard.uuid = uuid;
        reportCard.name = name;
        reportCard.standardReportCardType = standardReportCardType;
        reportCard.colour = colour;
        return reportCard;
    }
}

export default TestReportCardFactory;
