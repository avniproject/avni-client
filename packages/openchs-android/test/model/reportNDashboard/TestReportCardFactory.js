import {ReportCard} from 'openchs-models';
import General from "../../../src/utility/General";

class TestReportCardFactory {
    static create({uuid = General.randomUUID(), name, standardReportCardType, colour = "red",
                      standardReportCardInputSubjectTypes = [], standardReportCardInputPrograms = [], standardReportCardInputEncounterTypes = []}) {
        const reportCard = new ReportCard();
        reportCard.uuid = uuid;
        reportCard.name = name;
        reportCard.standardReportCardType = standardReportCardType;
        reportCard.colour = colour;
        reportCard.standardReportCardInputSubjectTypes = standardReportCardInputSubjectTypes;
        reportCard.standardReportCardInputPrograms = standardReportCardInputPrograms;
        reportCard.standardReportCardInputEncounterTypes = standardReportCardInputEncounterTypes;
        return reportCard;
    }
}

export default TestReportCardFactory;
