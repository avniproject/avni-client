import RealmQueryService from "../query/RealmQueryService";

class ReportCardQueryBuilder {
    static getProgramEncounterCriteria(reportCard) {
        const subjectTypeQuery = RealmQueryService.orKeyValueQuery("programEnrolment.individual.subjectType.uuid", reportCard.standardReportCardInputSubjectTypes.map((x) => x.uuid));
        const programQuery = RealmQueryService.orKeyValueQuery("programEnrolment.program.uuid", reportCard.standardReportCardInputPrograms.map((x) => x.uuid));
        const encounterTypeQuery = RealmQueryService.orKeyValueQuery("encounterType.uuid", reportCard.standardReportCardInputEncounterTypes.map((x) => x.uuid));
        return RealmQueryService.andQuery([subjectTypeQuery, programQuery, encounterTypeQuery]);
    }

    static getGeneralEncounterCriteria(reportCard) {
        const subjectTypeQuery = RealmQueryService.orKeyValueQuery("individual.subjectType.uuid", reportCard.standardReportCardInputSubjectTypes.map((x) => x.uuid));
        const encounterTypeQuery = RealmQueryService.orKeyValueQuery("encounterType.uuid", reportCard.standardReportCardInputEncounterTypes.map((x) => x.uuid));
        return RealmQueryService.andQuery([subjectTypeQuery, encounterTypeQuery]);
    }

    static getProgramEnrolmentCriteria(reportCard) {
        const subjectTypeQuery = RealmQueryService.orKeyValueQuery("individual.subjectType.uuid", reportCard.standardReportCardInputSubjectTypes.map((x) => x.uuid));
        const programQuery = RealmQueryService.orKeyValueQuery("program.uuid", reportCard.standardReportCardInputPrograms.map((x) => x.uuid));
        return RealmQueryService.andQuery([subjectTypeQuery, programQuery]);
    }

    static getSubjectCriteria(reportCard) {
        const uptoProgramEncounterCriteria = [];
        const uptoGeneralEncounterCriteria = [];

        const subjectCriteria = RealmQueryService.orKeyValueQuery("subjectType.uuid", reportCard.standardReportCardInputSubjectTypes.map((x) => x.uuid));
        if (reportCard.hasInputForSubject() > 0) uptoProgramEncounterCriteria.push(subjectCriteria);

        const programMatch = RealmQueryService.orKeyValueQuery("$enrolment.program.uuid", reportCard.standardReportCardInputPrograms.map((x) => x.uuid));
        const encounterTypeMatch = RealmQueryService.orKeyValueQuery("$encounter.encounterType.uuid", reportCard.standardReportCardInputEncounterTypes.map((x) => x.uuid));

        const programEnrolmentWithEncounterTypeCriteria = `subquery(enrolments, $enrolment, $enrolment.voided = false and (${programMatch}) and (subquery($enrolment.encounters, $encounter, $encounter.voided = false and (${encounterTypeMatch})).@count > 0)).@count > 0`;
        const programEnrolmentWithoutEncounterTypeCriteria = `subquery(enrolments, $enrolment, $enrolment.voided = false and (${programMatch})).@count > 0`;
        if (reportCard.hasInputForProgramEncounter())
            uptoProgramEncounterCriteria.push(programEnrolmentWithEncounterTypeCriteria);
        else if (reportCard.hasInputForEnrolment())
            uptoProgramEncounterCriteria.push(programEnrolmentWithoutEncounterTypeCriteria);

        if (reportCard.hasInputForGeneralEncounter()) {
            uptoGeneralEncounterCriteria.push(subjectCriteria);
            uptoGeneralEncounterCriteria.push(`subquery(encounters, $encounter, $encounter.voided = false and (${encounterTypeMatch})).@count > 0`);
        }

        return RealmQueryService.orQuery([RealmQueryService.andQuery(uptoProgramEncounterCriteria), RealmQueryService.andQuery(uptoGeneralEncounterCriteria)]);
    }
}

export default ReportCardQueryBuilder;
