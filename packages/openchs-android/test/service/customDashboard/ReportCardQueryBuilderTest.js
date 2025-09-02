import ReportCardQueryBuilder from "../../../src/service/customDashboard/ReportCardQueryBuilder";
import TestReportCardFactory from "../../model/reportNDashboard/TestReportCardFactory";
import {assert} from 'chai';
import TestSubjectTypeFactory from "../../model/TestSubjectTypeFactory";
import TestProgramFactory from "../../model/TestProgramFactory";
import TestEncounterTypeFactory from "../../model/TestEncounterTypeFactory";

it('should get subject getSubjectCriteria', function () {
    let reportCard = TestReportCardFactory.create({});
    assert.equal(ReportCardQueryBuilder.getSubjectCriteriaForReportCard(reportCard), "");

    reportCard = TestReportCardFactory.create({
        standardReportCardInputSubjectTypes: [TestSubjectTypeFactory.createWithDefaults({uuid: "st1"})],
        standardReportCardInputPrograms: [TestProgramFactory.create({uuid: "p1"})],
        standardReportCardInputEncounterTypes: [TestEncounterTypeFactory.create({uuid: "et1"})]
    });
    assert.equal(ReportCardQueryBuilder.getSubjectCriteriaForReportCard(reportCard), `( ( ( subjectType.uuid = "st1" ) AND subquery(enrolments, $enrolment, $enrolment.voided = false and $enrolment.programExitDateTime = null and (( $enrolment.program.uuid = "p1" )) and (subquery($enrolment.encounters, $encounter, $encounter.voided = false and (( $encounter.encounterType.uuid = "et1" ))).@count > 0)).@count > 0 ) OR ( ( subjectType.uuid = "st1" ) AND subquery(encounters, $encounter, $encounter.voided = false and (( $encounter.encounterType.uuid = "et1" ))).@count > 0 ) )`);
});

it('should filter program enrolments to include only active enrolments', function () {
    const subjectTypes = [TestSubjectTypeFactory.createWithDefaults({uuid: "st1"})];
    const programs = [TestProgramFactory.create({uuid: "p1"})];

    const result = ReportCardQueryBuilder.getProgramEnrolmentCriteria(subjectTypes, programs);

    // Should include active enrolment check (programExitDateTime = null)
    assert.include(result, "programExitDateTime = null");
    assert.include(result, "individual.subjectType.uuid = \"st1\"");
    assert.include(result, "program.uuid = \"p1\"");
});

it('should filter program encounters to include only active enrolments', function () {
    const subjectTypes = [TestSubjectTypeFactory.createWithDefaults({uuid: "st1"})];
    const programs = [TestProgramFactory.create({uuid: "p1"})];
    const encounterTypes = [TestEncounterTypeFactory.create({uuid: "et1"})];

    const result = ReportCardQueryBuilder.getProgramEncounterCriteria(subjectTypes, programs, encounterTypes);

    // Should include active enrolment check for program encounters
    assert.include(result, "programEnrolment.programExitDateTime = null");
    assert.include(result, "programEnrolment.individual.subjectType.uuid = \"st1\"");
    assert.include(result, "programEnrolment.program.uuid = \"p1\"");
    assert.include(result, "encounterType.uuid = \"et1\"");
});

it('should handle empty programs list without active enrolment filtering', function () {
    const subjectTypes = [TestSubjectTypeFactory.createWithDefaults({uuid: "st1"})];
    const programs = [];

    const result = ReportCardQueryBuilder.getProgramEnrolmentCriteria(subjectTypes, programs);

    // Should not include program-specific filtering when no programs specified
    assert.notInclude(result, "programExitDateTime");
    assert.include(result, "individual.subjectType.uuid = \"st1\"");
});
