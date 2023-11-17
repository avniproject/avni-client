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
    ReportCard
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

function getCount(reportCardService, card, reportFilters) {
    return reportCardService.getReportCardCount(card, reportFilters).primaryValue
}

class ReportCardServiceIntegrationTest extends BaseIntegrationTest {
    approvedCard;
    subjectType;
    addressLevel2;

    setup() {
        super.setup();
        this.executeInWrite((db) => {
            this.concept = db.create(Concept, TestConceptFactory.createWithDefaults({dataType: Concept.dataType.Text}));
            this.addressLevel = db.create(AddressLevel, TestAddressLevelFactory.createWithDefaults({level: 1}));
            this.addressLevel2 = db.create(AddressLevel, TestAddressLevelFactory.createWithDefaults({level: 1}));
            this.gender = db.create(Gender, TestGenderFactory.createWithDefaults({name: "Male"}));
            db.create(Settings, TestSettingsFactory.createWithDefaults({}));

            this.subjectType = db.create(SubjectType, TestSubjectTypeFactory.createWithDefaults({type: SubjectType.types.Person, name: 'Beneficiary'}));
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
            const pendingStatus = db.create(ApprovalStatus, TestApprovalStatusFactory.create({status: ApprovalStatus.statuses.Pending}));
            const subjectId = General.randomUUID();
            const encounterId = General.randomUUID();

            const subjectEAS = db.create(EntityApprovalStatus, TestEntityApprovalStatusFactory.create({
                entityType: EntityApprovalStatus.entityType.Subject,
                entityUUID: subjectId,
                entityTypeUuid: this.subjectType.uuid,
                approvalStatus: approvalStatus
            }));
            const encEAS = db.create(EntityApprovalStatus, TestEntityApprovalStatusFactory.create({
                entityType: EntityApprovalStatus.entityType.Encounter,
                entityUUID: encounterId,
                entityTypeUuid: encounterType.uuid,
                approvalStatus: pendingStatus
            }));
            const subject = db.create(Individual, TestSubjectFactory.createWithDefaults({
                subjectType: this.subjectType,
                address: this.addressLevel,
                firstName: "foo",
                lastName: "bar",
                observations: [TestObsFactory.create({concept: this.concept, valueJSON: JSON.stringify(this.concept.getValueWrapperFor("ABC"))})],
                approvalStatuses: [subjectEAS]
            }));

            db.create(Encounter, TestEncounterFactory.create({
                uuid: encounterId,
                earliestVisitDateTime: moment().add(-2, "day").toDate(),
                maxVisitDateTime: moment().add(2, "day").toDate(),
                encounterType: encounterType,
                approvalStatuses: [encEAS],
                subject: subject
            }));

            const approvedCardType = db.create(StandardReportCardType, TestStandardReportCardTypeFactory.create({name: StandardReportCardType.type.Approved}));
            const scheduledVisitsCardType = db.create(StandardReportCardType, TestStandardReportCardTypeFactory.create({name: StandardReportCardType.type.ScheduledVisits}));
            this.approvedCard = db.create(ReportCard, TestReportCardFactory.create({name: "a", standardReportCardType: approvedCardType}));
            this.scheduledVisitsCard = db.create(ReportCard, TestReportCardFactory.create({name: "b", standardReportCardType: scheduledVisitsCardType}));
        });
    }

    getResultForApprovalCardsType() {
        const reportCardService = this.getService(ReportCardService);
        assert.equal(1, getCount(reportCardService, this.approvedCard, []));
        let filterValues = [TestDashboardReportFilterFactory.create({type: CustomFilter.type.Address, filterValue: [this.addressLevel]})];
        assert.equal(1, getCount(reportCardService, this.approvedCard, filterValues));
        filterValues = [TestDashboardReportFilterFactory.create({type: CustomFilter.type.Address, filterValue: [this.addressLevel2]})];
        assert.equal(0, getCount(reportCardService, this.approvedCard, filterValues));
        filterValues = [TestDashboardReportFilterFactory.create({type: CustomFilter.type.Address, filterValue: [this.addressLevel, this.addressLevel2]})];
        assert.equal(1, getCount(reportCardService, this.approvedCard, filterValues));
    }

    getCountForDefaultCardsType() {
        const reportCardService = this.getService(ReportCardService);
        assert.equal(1, getCount(reportCardService, this.scheduledVisitsCard, []));
        assert.equal(1, getCount(reportCardService, this.scheduledVisitsCard, [TestDashboardReportFilterFactory.create({type: CustomFilter.type.Address, filterValue: [this.addressLevel]})]));
        assert.equal(0, getCount(reportCardService, this.scheduledVisitsCard, [TestDashboardReportFilterFactory.create({type: CustomFilter.type.Address, filterValue: [this.addressLevel2]})]));
    }
}

export default ReportCardServiceIntegrationTest;
