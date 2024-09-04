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
    assert.equal(ReportCardQueryBuilder.getSubjectCriteriaForReportCard(reportCard), `( ( ( subjectType.uuid = "st1" ) AND subquery(enrolments, $enrolment, $enrolment.voided = false and (( $enrolment.program.uuid = "p1" )) and (subquery($enrolment.encounters, $encounter, $encounter.voided = false and (( $encounter.encounterType.uuid = "et1" ))).@count > 0)).@count > 0 ) OR ( ( subjectType.uuid = "st1" ) AND subquery(encounters, $encounter, $encounter.voided = false and (( $encounter.encounterType.uuid = "et1" ))).@count > 0 ) )`);
});
