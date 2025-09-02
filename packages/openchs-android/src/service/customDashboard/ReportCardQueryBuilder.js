import RealmQueryService from "../query/RealmQueryService";

class ReportCardQueryBuilder {
    static getProgramEncounterCriteriaForReportCard(reportCard) {
        return this.getProgramEncounterCriteria(reportCard.standardReportCardInputSubjectTypes, reportCard.standardReportCardInputPrograms, reportCard.standardReportCardInputEncounterTypes);
    }

    static getProgramEncounterCriteria(subjectTypes, programs, encounterTypes) {
        const subjectTypeQuery = RealmQueryService.orKeyValueQuery("programEnrolment.individual.subjectType.uuid", subjectTypes.map((x) => x.uuid));
        const programQuery = RealmQueryService.orKeyValueQuery("programEnrolment.program.uuid", programs.map((x) => x.uuid));
        const encounterTypeQuery = RealmQueryService.orKeyValueQuery("encounterType.uuid", encounterTypes.map((x) => x.uuid));
        const activeEnrolmentQuery = "programEnrolment.programExitDateTime = null";
        return RealmQueryService.andQuery([subjectTypeQuery, programQuery, encounterTypeQuery, activeEnrolmentQuery]);
    }

    static getGeneralEncounterCriteriaForReportCard(reportCard) {
        return this.getGeneralEncounterCriteria(reportCard.standardReportCardInputSubjectTypes, reportCard.standardReportCardInputEncounterTypes);
    }

    static getGeneralEncounterCriteria(subjectTypes, encounterTypes) {
        const subjectTypeQuery = RealmQueryService.orKeyValueQuery("individual.subjectType.uuid", subjectTypes.map((x) => x.uuid));
        const encounterTypeQuery = RealmQueryService.orKeyValueQuery("encounterType.uuid", encounterTypes.map((x) => x.uuid));
        return RealmQueryService.andQuery([subjectTypeQuery, encounterTypeQuery]);
    }

    static getProgramEnrolmentCriteriaForReportCard(reportCard) {
        return this.getProgramEnrolmentCriteria(reportCard.standardReportCardInputSubjectTypes, reportCard.standardReportCardInputPrograms);
    }

    static getProgramEnrolmentCriteria(subjectTypes, programs) {
        const subjectTypeQuery = RealmQueryService.orKeyValueQuery("individual.subjectType.uuid", subjectTypes.map((x) => x.uuid));
        const programQuery = RealmQueryService.orKeyValueQuery("program.uuid", programs.map((x) => x.uuid));
        const activeEnrolmentQuery = "programExitDateTime = null";
        return RealmQueryService.andQuery([subjectTypeQuery, programQuery, activeEnrolmentQuery]);
    }

    static getSubjectCriteriaForReportCard(reportCard) {
        return this.getSubjectCriteria(reportCard.standardReportCardInputSubjectTypes, reportCard.standardReportCardInputPrograms, reportCard.standardReportCardInputEncounterTypes);
    }

    static getSubjectCriteria(subjectTypes, programs, encounterTypes) {
        const uptoProgramEncounterCriteria = [];
        const uptoGeneralEncounterCriteria = [];

        const subjectCriteria = RealmQueryService.orKeyValueQuery("subjectType.uuid", subjectTypes.map((x) => x.uuid));
        if (subjectTypes.length > 0) uptoProgramEncounterCriteria.push(subjectCriteria);

        const programMatch = RealmQueryService.orKeyValueQuery("$enrolment.program.uuid", programs.map((x) => x.uuid));
        const encounterTypeMatch = RealmQueryService.orKeyValueQuery("$encounter.encounterType.uuid", encounterTypes.map((x) => x.uuid));

        const programEnrolmentWithEncounterTypeCriteria = `subquery(enrolments, $enrolment, $enrolment.voided = false and $enrolment.programExitDateTime = null and (${programMatch}) and (subquery($enrolment.encounters, $encounter, $encounter.voided = false and (${encounterTypeMatch})).@count > 0)).@count > 0`;
        const programEnrolmentWithoutEncounterTypeCriteria = `subquery(enrolments, $enrolment, $enrolment.voided = false and $enrolment.programExitDateTime = null and (${programMatch})).@count > 0`;
        if (programs.length > 0 && encounterTypes.length > 0)
            uptoProgramEncounterCriteria.push(programEnrolmentWithEncounterTypeCriteria);
        else if (programs.length > 0)
            uptoProgramEncounterCriteria.push(programEnrolmentWithoutEncounterTypeCriteria);

        if (encounterTypes.length > 0) {
            uptoGeneralEncounterCriteria.push(subjectCriteria);
            uptoGeneralEncounterCriteria.push(`subquery(encounters, $encounter, $encounter.voided = false and (${encounterTypeMatch})).@count > 0`);
        }

        return RealmQueryService.orQuery([RealmQueryService.andQuery(uptoProgramEncounterCriteria), RealmQueryService.andQuery(uptoGeneralEncounterCriteria)]);
    }
}

export default ReportCardQueryBuilder;
