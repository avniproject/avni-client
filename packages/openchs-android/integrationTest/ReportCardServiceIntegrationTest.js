import BaseIntegrationTest from "./BaseIntegrationTest";
import {
    EncounterType,
    Encounter,
    ApprovalStatus,
    EntityApprovalStatus,
    AddressLevel,
    Concept,
    Form,
    StandardReportCardType,
    FormElement,
    FormElementGroup,
    FormMapping,
    Gender,
    Individual,
    OrganisationConfig,
    Settings,
    SubjectType,
    CustomFilter,
    ReportCard,
    Program,
    ProgramEnrolment,
    ProgramEncounter
} from "openchs-models";
import TestConceptFactory from "../test/model/TestConceptFactory";
import TestAddressLevelFactory from "../test/model/TestAddressLevelFactory";
import TestGenderFactory from "../test/model/TestGenderFactory";
import TestSettingsFactory from "../test/model/user/TestSettingsFactory";
import TestSubjectTypeFactory from "../test/model/TestSubjectTypeFactory";
import TestFormFactory from "../test/model/form/TestFormFactory";
import TestFormElementGroupFactory from "../test/model/form/TestFormElementGroupFactory";
import TestFormElementFactory from "../test/model/form/TestFormElementFactory";
import TestKeyValueFactory from "../test/model/TestKeyValueFactory";
import TestFormMappingFactory from "../test/model/form/TestFormMappingFactory";
import TestOrganisationConfigFactory from "../test/model/TestOrganisationConfigFactory";
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

function getCount(test, card, reportFilters) {
    return test.reportCardService.getReportCardCount(card, reportFilters).primaryValue
}

class ReportCardServiceIntegrationTest extends BaseIntegrationTest {
    setup() {
        super.setup();
        this.executeInWrite((db) => {
            this.concept = db.create(Concept, TestConceptFactory.createWithDefaults({dataType: Concept.dataType.Text}));
            this.addressLevel = db.create(AddressLevel, TestAddressLevelFactory.createWithDefaults({level: 1}));
            this.addressLevel2 = db.create(AddressLevel, TestAddressLevelFactory.createWithDefaults({level: 1}));
            this.gender = db.create(Gender, TestGenderFactory.createWithDefaults({name: "Male"}));
            db.create(Settings, TestSettingsFactory.createWithDefaults({}));

            this.subjectType = db.create(SubjectType, TestSubjectTypeFactory.createWithDefaults({type: SubjectType.types.Person, name: 'Beneficiary'}));
            const program = db.create(Program, TestProgramFactory.create({name: 'Mother'}));
            const programEncounterType = db.create(EncounterType, TestEncounterTypeFactory.create({name: "Delivery"}));
            const encounterType = db.create(EncounterType, TestEncounterTypeFactory.create({name: "Bar"}));
            const form = db.create(Form, TestFormFactory.createWithDefaults({formType: Form.formTypes.IndividualProfile}));
            const formElementGroup = db.create(FormElementGroup, TestFormElementGroupFactory.create({form: form}));
            db.create(FormElement, TestFormElementFactory.create({
                uuid: "FOO",
                concept: this.concept,
                displayOrder: 1,
                formElementGroup: formElementGroup,
                mandatory: true,
                keyValues: [TestKeyValueFactory.create({key: "unique", value: "true"})]
            }));
            db.create(FormMapping, TestFormMappingFactory.createWithDefaults({subjectType: this.subjectType, form: form}));
            db.create(OrganisationConfig, TestOrganisationConfigFactory.createWithDefaults({}));
            const approvalStatus = db.create(ApprovalStatus, TestApprovalStatusFactory.create({}));
            const enrolmentApprovalStatus = db.create(ApprovalStatus, TestApprovalStatusFactory.create({}));
            const pendingStatus = db.create(ApprovalStatus, TestApprovalStatusFactory.create({status: ApprovalStatus.statuses.Pending}));
            const programEncRejectedStatus = db.create(ApprovalStatus, TestApprovalStatusFactory.create({status: ApprovalStatus.statuses.Rejected}));
            const subject1Id = General.randomUUID();
            const subject2Id = General.randomUUID();
            const encounterId1 = General.randomUUID();
            const encounterId2 = General.randomUUID();
            const programEnrolmentId1 = General.randomUUID();
            const programEnrolmentId2 = General.randomUUID();
            const programEncounterId1 = General.randomUUID();
            const programEncounterId2 = General.randomUUID();

            const subjectEAS = db.create(EntityApprovalStatus, TestEntityApprovalStatusFactory.create({
                entityType: EntityApprovalStatus.entityType.Subject,
                entityUUID: subject1Id,
                entityTypeUuid: this.subjectType.uuid,
                approvalStatus: approvalStatus
            }));
            const encEAS = db.create(EntityApprovalStatus, TestEntityApprovalStatusFactory.create({
                entityType: EntityApprovalStatus.entityType.Encounter,
                entityUUID: encounterId1,
                entityTypeUuid: encounterType.uuid,
                approvalStatus: pendingStatus
            }));
            const subject1 = db.create(Individual, TestSubjectFactory.createWithDefaults({
                uuid: subject1Id,
                subjectType: this.subjectType,
                address: this.addressLevel,
                firstName: "foo",
                lastName: "bar",
                observations: [TestObsFactory.create({concept: this.concept, valueJSON: JSON.stringify(this.concept.getValueWrapperFor("ABC"))})],
                approvalStatuses: [subjectEAS]
            }));

            subject1.addEncounter(db.create(Encounter, TestEncounterFactory.create({
                uuid: encounterId1,
                earliestVisitDateTime: moment().add(-2, "day").toDate(),
                maxVisitDateTime: moment().add(2, "day").toDate(),
                encounterType: encounterType,
                approvalStatuses: [encEAS],
                latestEntityApprovalStatus: null,
                subject: subject1
            })));

            subject1.addEncounter(db.create(Encounter, TestEncounterFactory.create({
                uuid: encounterId2,
                earliestVisitDateTime: moment().add(-10, "day").toDate(),
                maxVisitDateTime: moment().add(-5, "day").toDate(),
                encounterType: encounterType,
                approvalStatuses: [],
                latestEntityApprovalStatus: null,
                subject: subject1
            })));

            const programEnrolment1 = db.create(ProgramEnrolment, TestProgramEnrolmentFactory.create({
                uuid: programEnrolmentId1,
                program,
                subject: subject1,
                enrolmentDateTime: moment().toDate(),
                latestEntityApprovalStatus: null,
                observations: [TestObsFactory.create({concept: this.concept, valueJSON: JSON.stringify(this.concept.getValueWrapperFor("ABCPRG"))})],
                approvalStatuses: []
            }));

            const subject2 = db.create(Individual, TestSubjectFactory.createWithDefaults({
                uuid: subject2Id,
                subjectType: this.subjectType,
                address: this.addressLevel2,
                firstName: "foo2",
                lastName: "bar2",
                observations: [TestObsFactory.create({concept: this.concept, valueJSON: JSON.stringify(this.concept.getValueWrapperFor("DEF"))})],
                approvalStatuses: []
            }));

            const enrolmentEAS = db.create(EntityApprovalStatus, TestEntityApprovalStatusFactory.create({
                entityType: EntityApprovalStatus.entityType.ProgramEnrolment,
                entityUUID: programEnrolmentId2,
                entityTypeUuid: program.uuid,
                approvalStatus: enrolmentApprovalStatus
            }));
            const programEnc2EAS = db.create(EntityApprovalStatus, TestEntityApprovalStatusFactory.create({
                entityType: EntityApprovalStatus.entityType.ProgramEncounter,
                entityUUID: programEncounterId2,
                entityTypeUuid: programEncounterType.uuid,
                approvalStatus: programEncRejectedStatus
            }));

            const programEnrolment2 = db.create(ProgramEnrolment, TestProgramEnrolmentFactory.create({
                uuid: programEnrolmentId2,
                program,
                subject: subject2,
                enrolmentDateTime: moment().add(-10, "day").toDate(),
                latestEntityApprovalStatus: null,
                observations: [TestObsFactory.create({concept: this.concept, valueJSON: JSON.stringify(this.concept.getValueWrapperFor("DEFPRG"))})],
                approvalStatuses: [enrolmentEAS]
            }));

            programEnrolment2.addEncounter(db.create(ProgramEncounter, TestProgramEncounterFactory.create({
                uuid: programEncounterId1,
                encounterDateTime:  moment().add(-2, "day").toDate(),
                earliestVisitDateTime: moment().add(-10, "day").toDate(),
                maxVisitDateTime: moment().add(-5, "day").toDate(),
                encounterType: programEncounterType,
                programEnrolment: programEnrolment2,
                approvalStatuses: [],
                latestEntityApprovalStatus: null
            })));

            programEnrolment2.addEncounter(db.create(ProgramEncounter, TestProgramEncounterFactory.create({
                uuid: programEncounterId2,
                encounterDateTime: moment().toDate(),
                earliestVisitDateTime: moment().add(-2, "day").toDate(),
                maxVisitDateTime: moment().add(2, "day").toDate(),
                encounterType: programEncounterType,
                programEnrolment: programEnrolment2,
                approvalStatuses: [programEnc2EAS],
                latestEntityApprovalStatus: programEnc2EAS
            })));

            const approvedCardType = db.create(StandardReportCardType, TestStandardReportCardTypeFactory.create({name: StandardReportCardType.type.Approved}));
            const scheduledVisitsCardType = db.create(StandardReportCardType, TestStandardReportCardTypeFactory.create({name: StandardReportCardType.type.ScheduledVisits}));
            const overdueVisitsCardType = db.create(StandardReportCardType, TestStandardReportCardTypeFactory.create({name: StandardReportCardType.type.OverdueVisits}));
            const latestVisitsCardType = db.create(StandardReportCardType, TestStandardReportCardTypeFactory.create({name: StandardReportCardType.type.LatestVisits}));
            const latestRegistrationsCardType = db.create(StandardReportCardType, TestStandardReportCardTypeFactory.create({name: StandardReportCardType.type.LatestRegistrations}));
            const latestEnrolmentsCardType = db.create(StandardReportCardType, TestStandardReportCardTypeFactory.create({name: StandardReportCardType.type.LatestEnrolments}));
            this.approvedCard = db.create(ReportCard, TestReportCardFactory.create({name: "approvedCard", standardReportCardType: approvedCardType}));
            this.scheduledVisitsCard = db.create(ReportCard, TestReportCardFactory.create({name: "scheduledVisitsCard", standardReportCardType: scheduledVisitsCardType}));
            this.overdueVisitsCard = db.create(ReportCard, TestReportCardFactory.create({name: "overdueVisitsCard", standardReportCardType: overdueVisitsCardType}));
            this.latestVisitsCard = db.create(ReportCard, TestReportCardFactory.create({name: "latestVisitsCard", standardReportCardType: latestVisitsCardType}));
            this.latestRegistrationsCard = db.create(ReportCard, TestReportCardFactory.create({name: "latestRegistrationsCard", standardReportCardType: latestRegistrationsCardType}));
            this.latestEnrolmentsCard = db.create(ReportCard, TestReportCardFactory.create({name: "latestEnrolmentsCard", standardReportCardType: latestEnrolmentsCardType}));
        });

        this.reportCardService = this.getService(ReportCardService);
        this.addressSelected = TestDashboardReportFilterFactory.create({type: CustomFilter.type.Address, filterValue: [this.addressLevel]});
        this.address2Selected = TestDashboardReportFilterFactory.create({type: CustomFilter.type.Address, filterValue: [this.addressLevel2]});
        this.twoAddressSelected = TestDashboardReportFilterFactory.create({type: CustomFilter.type.Address, filterValue: [this.addressLevel, this.addressLevel2]});
    }

    getResultForApprovalCardsType() {
        assert.equal(1, getCount(this, this.approvedCard, []));
        assert.equal(1, getCount(this, this.approvedCard, [this.addressSelected]));
        assert.equal(0, getCount(this, this.approvedCard, [this.address2Selected]));
        assert.equal(1, getCount(this, this.approvedCard, [this.twoAddressSelected]));
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
}

export default ReportCardServiceIntegrationTest;
