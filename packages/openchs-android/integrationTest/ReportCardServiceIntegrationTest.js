import BaseIntegrationTest from "./BaseIntegrationTest";
import {
    ApprovalStatus, Concept,
    CustomFilter,
    Encounter,
    EncounterType,
    EntityApprovalStatus,
    Individual,
    Program,
    ProgramEncounter,
    ProgramEnrolment,
    ReportCard,
    StandardReportCardType,
    SubjectType
} from "openchs-models";
import TestSubjectTypeFactory from "../test/model/TestSubjectTypeFactory";
import TestSubjectFactory from "../test/model/txn/TestSubjectFactory";
import TestObsFactory from "../test/model/TestObsFactory";
import ReportCardService from "../src/service/customDashboard/ReportCardService";
import TestStandardReportCardTypeFactory from "../test/model/reportNDashboard/TestStandardReportCardTypeFactory";
import TestReportCardFactory from "../test/model/reportNDashboard/TestReportCardFactory";
import TestDashboardReportFilterFactory from "../test/model/reportNDashboard/TestDashboardReportFilterFactory";
import {assert} from "chai";
import General from "../src/utility/General";
import TestEntityApprovalStatusFactory from "../test/model/approval/TestEntityApprovalStatusFactory";
import TestApprovalStatusFactory from "../test/model/approval/TestApprovalStatusFactory";
import TestEncounterFactory from "../test/model/txn/TestEncounterFactory";
import TestEncounterTypeFactory from "../test/model/TestEncounterTypeFactory";
import moment from "moment";
import TestProgramFactory from '../test/model/TestProgramFactory';
import TestProgramEnrolmentFactory from '../test/model/txn/TestProgramEnrolmentFactory';
import TestProgramEncounterFactory from '../test/model/txn/TestProgramEncounterFactory';
import TestChecklistService from "./service/TestChecklistService";
import TestOrganisationService from "./service/TestOrganisationService";
import TestConceptFactory from "../test/model/TestConceptFactory";
import TestMetadataService from "./service/TestMetadataService";

function getCount(test, card, reportFilters) {
    return test.reportCardService.getReportCardCount(card, reportFilters).primaryValue
}

class ReportCardServiceIntegrationTest extends BaseIntegrationTest {
    setup() {
        super.setup();
        this.executeInWrite((db) => {
            this.organisationData = TestOrganisationService.setupOrganisation(db);
            this.concept = db.create(Concept, TestConceptFactory.createWithDefaults({dataType: Concept.dataType.Text}));
            this.metadata = TestMetadataService.create(db);

            const subject1Id = General.randomUUID();
            const subject2Id = General.randomUUID();
            const encounterId1 = General.randomUUID();
            const encounterId2 = General.randomUUID();
            const programEnrolmentId1 = General.randomUUID();
            const programEnrolmentId2 = General.randomUUID();
            const programEncounterId1 = General.randomUUID();
            const programEncounterId2 = General.randomUUID();

            const subject1EAS = db.create(EntityApprovalStatus, TestEntityApprovalStatusFactory.create({
                entityType: EntityApprovalStatus.entityType.Subject,
                entityUUID: subject1Id,
                entityTypeUuid: this.metadata.subjectType.uuid,
                approvalStatus: this.metadata.approvalStatus
            }));
            const encEAS = db.create(EntityApprovalStatus, TestEntityApprovalStatusFactory.create({
                entityType: EntityApprovalStatus.entityType.Encounter,
                entityUUID: encounterId1,
                entityTypeUuid: this.metadata.encounterType.uuid,
                approvalStatus: this.metadata.pendingStatus
            }));
            const subject1 = db.create(Individual, TestSubjectFactory.createWithDefaults({
                uuid: subject1Id,
                subjectType: this.metadata.subjectType,
                address: this.organisationData.addressLevel,
                firstName: "foo",
                lastName: "bar",
                observations: [TestObsFactory.create({concept: this.concept, valueJSON: JSON.stringify(this.concept.getValueWrapperFor("ABC"))})],
                approvalStatuses: [subject1EAS]
            }));

            subject1.addEncounter(db.create(Encounter, TestEncounterFactory.create({
                uuid: encounterId1,
                earliestVisitDateTime: moment().add(-2, "day").toDate(),
                maxVisitDateTime: moment().add(2, "day").toDate(),
                encounterType: this.metadata.encounterType,
                approvalStatuses: [encEAS],
                latestEntityApprovalStatus: null,
                subject: subject1
            })));

            subject1.addEncounter(db.create(Encounter, TestEncounterFactory.create({
                uuid: encounterId2,
                earliestVisitDateTime: moment().add(-10, "day").toDate(),
                maxVisitDateTime: moment().add(-5, "day").toDate(),
                encounterType: this.metadata.encounterType,
                approvalStatuses: [],
                latestEntityApprovalStatus: null,
                subject: subject1
            })));

            const programEnrolment1 = db.create(ProgramEnrolment, TestProgramEnrolmentFactory.create({
                uuid: programEnrolmentId1,
                program: this.metadata.program,
                subject: subject1,
                enrolmentDateTime: moment().toDate(),
                latestEntityApprovalStatus: null,
                observations: [TestObsFactory.create({concept: this.concept, valueJSON: JSON.stringify(this.concept.getValueWrapperFor("ABCPRG"))})],
                approvalStatuses: []
            }));

            TestChecklistService.createChecklist(programEnrolment1, db);

            const subject2EAS = db.create(EntityApprovalStatus, TestEntityApprovalStatusFactory.create({
                entityType: EntityApprovalStatus.entityType.Subject,
                entityUUID: subject2Id,
                entityTypeUuid: this.metadata.subjectType.uuid,
                approvalStatus: this.metadata.pendingStatus
            }));
            const subject2 = db.create(Individual, TestSubjectFactory.createWithDefaults({
                uuid: subject2Id,
                subjectType: this.metadata.subjectType,
                address: this.organisationData.addressLevel2,
                firstName: "foo2",
                lastName: "bar2",
                observations: [TestObsFactory.create({concept: this.concept, valueJSON: JSON.stringify(this.concept.getValueWrapperFor("DEF"))})],
                approvalStatuses: [subject2EAS]
            }));

            const enrolmentEAS = db.create(EntityApprovalStatus, TestEntityApprovalStatusFactory.create({
                entityType: EntityApprovalStatus.entityType.ProgramEnrolment,
                entityUUID: programEnrolmentId2,
                entityTypeUuid: this.metadata.program.uuid,
                approvalStatus: this.metadata.enrolmentApprovalStatus
            }));
            const programEnc2EAS = db.create(EntityApprovalStatus, TestEntityApprovalStatusFactory.create({
                entityType: EntityApprovalStatus.entityType.ProgramEncounter,
                entityUUID: programEncounterId2,
                entityTypeUuid: this.metadata.programEncounterType.uuid,
                approvalStatus: this.metadata.rejectedStatus
            }));

            const programEnrolment2 = db.create(ProgramEnrolment, TestProgramEnrolmentFactory.create({
                uuid: programEnrolmentId2,
                program: this.metadata.program,
                subject: subject2,
                enrolmentDateTime: moment().add(-10, "day").toDate(),
                latestEntityApprovalStatus: null,
                observations: [TestObsFactory.create({concept: this.concept, valueJSON: JSON.stringify(this.concept.getValueWrapperFor("DEFPRG"))})],
                approvalStatuses: [enrolmentEAS]
            }));

            TestChecklistService.createChecklist(programEnrolment2, db, false);

            programEnrolment2.addEncounter(db.create(ProgramEncounter, TestProgramEncounterFactory.create({
                uuid: programEncounterId1,
                encounterDateTime: moment().add(-2, "day").toDate(),
                earliestVisitDateTime: moment().add(-10, "day").toDate(),
                maxVisitDateTime: moment().add(-5, "day").toDate(),
                encounterType: this.metadata.programEncounterType,
                programEnrolment: programEnrolment2,
                approvalStatuses: [],
                latestEntityApprovalStatus: null
            })));

            programEnrolment2.addEncounter(db.create(ProgramEncounter, TestProgramEncounterFactory.create({
                uuid: programEncounterId2,
                encounterDateTime: moment().toDate(),
                earliestVisitDateTime: moment().add(-2, "day").toDate(),
                maxVisitDateTime: moment().add(2, "day").toDate(),
                encounterType: this.metadata.programEncounterType,
                programEnrolment: programEnrolment2,
                approvalStatuses: [programEnc2EAS],
                latestEntityApprovalStatus: programEnc2EAS
            })));

            const approvedCardType = db.create(StandardReportCardType, TestStandardReportCardTypeFactory.create({name: StandardReportCardType.type.Approved}));
            const pendingCardType = db.create(StandardReportCardType, TestStandardReportCardTypeFactory.create({name: StandardReportCardType.type.PendingApproval}));
            const scheduledVisitsCardType = db.create(StandardReportCardType, TestStandardReportCardTypeFactory.create({name: StandardReportCardType.type.ScheduledVisits}));
            const overdueVisitsCardType = db.create(StandardReportCardType, TestStandardReportCardTypeFactory.create({name: StandardReportCardType.type.OverdueVisits}));
            const latestVisitsCardType = db.create(StandardReportCardType, TestStandardReportCardTypeFactory.create({name: StandardReportCardType.type.LatestVisits}));
            const latestRegistrationsCardType = db.create(StandardReportCardType, TestStandardReportCardTypeFactory.create({name: StandardReportCardType.type.LatestRegistrations}));
            const latestEnrolmentsCardType = db.create(StandardReportCardType, TestStandardReportCardTypeFactory.create({name: StandardReportCardType.type.LatestEnrolments}));
            const totalCardType = db.create(StandardReportCardType, TestStandardReportCardTypeFactory.create({name: StandardReportCardType.type.Total}));
            const dueChecklistCardType = db.create(StandardReportCardType, TestStandardReportCardTypeFactory.create({name: StandardReportCardType.type.DueChecklist}));
            this.approvedCard = db.create(ReportCard, TestReportCardFactory.create({name: "approvedCard", standardReportCardType: approvedCardType}));
            this.pendingCard = db.create(ReportCard, TestReportCardFactory.create({name: "pendingCard", standardReportCardType: pendingCardType}));
            this.scheduledVisitsCard = db.create(ReportCard, TestReportCardFactory.create({
                name: "scheduledVisitsCard",
                standardReportCardType: scheduledVisitsCardType
            }));
            this.overdueVisitsCard = db.create(ReportCard, TestReportCardFactory.create({name: "overdueVisitsCard", standardReportCardType: overdueVisitsCardType}));
            this.latestVisitsCard = db.create(ReportCard, TestReportCardFactory.create({name: "latestVisitsCard", standardReportCardType: latestVisitsCardType}));
            this.latestRegistrationsCard = db.create(ReportCard, TestReportCardFactory.create({
                name: "latestRegistrationsCard",
                standardReportCardType: latestRegistrationsCardType
            }));
            this.latestEnrolmentsCard = db.create(ReportCard, TestReportCardFactory.create({
                name: "latestEnrolmentsCard",
                standardReportCardType: latestEnrolmentsCardType
            }));
            this.totalCard = db.create(ReportCard, TestReportCardFactory.create({name: "totalCard", standardReportCardType: totalCardType}));
            this.dueChecklistCard = db.create(ReportCard, TestReportCardFactory.create({name: "dueChecklistCard", standardReportCardType: dueChecklistCardType}));
        });

        this.reportCardService = this.getService(ReportCardService);
        this.addressSelected = TestDashboardReportFilterFactory.create({type: CustomFilter.type.Address, filterValue: [this.organisationData.addressLevel]});
        this.address2Selected = TestDashboardReportFilterFactory.create({type: CustomFilter.type.Address, filterValue: [this.organisationData.addressLevel2]});
        this.twoAddressSelected = TestDashboardReportFilterFactory.create({
            type: CustomFilter.type.Address,
            filterValue: [this.organisationData.addressLevel, this.organisationData.addressLevel2]
        });
    }

    getResultForApprovalCardsType() {
        assert.equal(1, getCount(this, this.approvedCard, []));
        assert.equal(1, getCount(this, this.approvedCard, [this.addressSelected]));
        assert.equal(0, getCount(this, this.approvedCard, [this.address2Selected]));
        assert.equal(1, getCount(this, this.approvedCard, [this.twoAddressSelected]));
    }

    getResultForPendingCardsType() {
        assert.equal(1, getCount(this, this.pendingCard, []));
        assert.equal(0, getCount(this, this.pendingCard, [this.addressSelected]));
        assert.equal(1, getCount(this, this.pendingCard, [this.address2Selected]));
        assert.equal(1, getCount(this, this.pendingCard, [this.twoAddressSelected]));
    }

    getCountForDefaultCardsType_forScheduledVisits() {
        assert.equal(1, getCount(this, this.scheduledVisitsCard, []));
        assert.equal(1, getCount(this, this.scheduledVisitsCard, [this.addressSelected]));
        assert.equal(0, getCount(this, this.scheduledVisitsCard, [this.address2Selected]));
        assert.equal(1, getCount(this, this.scheduledVisitsCard, [this.twoAddressSelected]));
    }

    getCountForDefaultCardsType_forOverdueVisits() {
        assert.equal(1, getCount(this, this.overdueVisitsCard, []));
        assert.equal(1, getCount(this, this.overdueVisitsCard, [this.addressSelected]));
        assert.equal(0, getCount(this, this.overdueVisitsCard, [this.address2Selected]));
        assert.equal(1, getCount(this, this.overdueVisitsCard, [this.twoAddressSelected]));
    }

    getCountForDefaultCardsType_forLatestVisits() {
        assert.equal(1, getCount(this, this.latestVisitsCard, []));
        assert.equal(0, getCount(this, this.latestVisitsCard, [this.addressSelected]));
        assert.equal(1, getCount(this, this.latestVisitsCard, [this.address2Selected]));
        assert.equal(1, getCount(this, this.latestVisitsCard, [this.twoAddressSelected]));
    }

    getCountForDefaultCardsType_forLatestRegistrations() {
        assert.equal(2, getCount(this, this.latestRegistrationsCard, []));
        assert.equal(1, getCount(this, this.latestRegistrationsCard, [this.addressSelected]));
        assert.equal(1, getCount(this, this.latestRegistrationsCard, [this.address2Selected]));
        assert.equal(2, getCount(this, this.latestRegistrationsCard, [this.twoAddressSelected]));
    }

    getCountForDefaultCardsType_forLatestEnrolments() {
        assert.equal(1, getCount(this, this.latestEnrolmentsCard, []));
        assert.equal(1, getCount(this, this.latestEnrolmentsCard, [this.addressSelected]));
        assert.equal(0, getCount(this, this.latestEnrolmentsCard, [this.address2Selected]));
        assert.equal(1, getCount(this, this.latestEnrolmentsCard, [this.twoAddressSelected]));
    }

    getCountForDefaultCardsType_forTotal() {
        assert.equal(2, getCount(this, this.totalCard, []));
        assert.equal(1, getCount(this, this.totalCard, [this.addressSelected]));
        assert.equal(1, getCount(this, this.totalCard, [this.address2Selected]));
        assert.equal(2, getCount(this, this.totalCard, [this.twoAddressSelected]));
    }

    getCountForDefaultCardsType_forDueChecklist() {
        assert.equal(1, getCount(this, this.dueChecklistCard, []));
        assert.equal(1, getCount(this, this.dueChecklistCard, [this.addressSelected]));
        assert.equal(0, getCount(this, this.dueChecklistCard, [this.address2Selected]));
        assert.equal(1, getCount(this, this.dueChecklistCard, [this.twoAddressSelected]));
    }
}

export default ReportCardServiceIntegrationTest;
