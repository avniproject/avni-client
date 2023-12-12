import BaseIntegrationTest from "../BaseIntegrationTest";
import TestOrganisationService from "../service/TestOrganisationService";
import {Concept, EntityApprovalStatus, Individual, ProgramEnrolment} from "openchs-models";
import TestConceptFactory from "../../test/model/TestConceptFactory";
import TestMetadataService from "../service/TestMetadataService";
import General from "../../src/utility/General";
import TestEntityApprovalStatusFactory from "../../test/model/approval/TestEntityApprovalStatusFactory";
import TestSubjectFactory from "../../test/model/txn/TestSubjectFactory";
import TestObsFactory from "../../test/model/TestObsFactory";
import TestProgramEnrolmentFactory from "../../test/model/txn/TestProgramEnrolmentFactory";
import moment from "moment";
import {assert} from "chai";
import TestProgramFactory from "../../test/model/TestProgramFactory";

class IndividualIntegrationTest extends BaseIntegrationTest {
    setup(): this {
        super.setup();
        this.executeInWrite((db) => {
            this.organisationData = TestOrganisationService.setupOrganisation(db);
            this.concept = db.create(Concept, TestConceptFactory.createWithDefaults({dataType: Concept.dataType.Text}));
            this.metadata = TestMetadataService.create(db);
        });
    }

    getMemberEntitiesWithLatestStatus() {
        const enrolment1Id = General.randomUUID();
        let program2Enrolment;
        this.executeInWrite((db) => {
            const subject1Id = General.randomUUID();
            const enrolment2Id = General.randomUUID();

            const subject1EAS = db.create(EntityApprovalStatus, TestEntityApprovalStatusFactory.create({
                entityType: EntityApprovalStatus.entityType.Subject,
                entityUUID: subject1Id,
                entityTypeUuid: this.metadata.subjectType.uuid,
                approvalStatus: this.metadata.approvedStatus
            }));
            this.subject = db.create(Individual, TestSubjectFactory.createWithDefaults({
                uuid: subject1Id,
                subjectType: this.metadata.subjectType,
                address: this.organisationData.addressLevel,
                firstName: "XYZ",
                lastName: "bar",
                observations: [TestObsFactory.create({concept: this.concept, valueJSON: JSON.stringify(this.concept.getValueWrapperFor("ABC"))})],
                approvalStatuses: [subject1EAS]
            }));
            const enrolment1EAS = db.create(EntityApprovalStatus, TestEntityApprovalStatusFactory.create({
                entityType: EntityApprovalStatus.entityType.ProgramEnrolment,
                entityUUID: enrolment1Id,
                entityTypeUuid: this.metadata.program.uuid,
                approvalStatus: this.metadata.approvedStatus
            }));
            const enrolment1 = db.create(ProgramEnrolment, TestProgramEnrolmentFactory.create({
                uuid: enrolment1Id,
                program: this.metadata.program,
                subject: this.subject,
                enrolmentDateTime: moment().add(-10, "day").toDate(),
                observations: [TestObsFactory.create({concept: this.concept, valueJSON: JSON.stringify(this.concept.getValueWrapperFor("DEFPRG"))})],
                approvalStatuses: [enrolment1EAS]
            }));
            const enrolment2EAS = db.create(EntityApprovalStatus, TestEntityApprovalStatusFactory.create({
                entityType: EntityApprovalStatus.entityType.ProgramEnrolment,
                entityUUID: enrolment2Id,
                entityTypeUuid: this.metadata.program.uuid,
                approvalStatus: this.metadata.approvedStatus
            }));
            const enrolment2 = db.create(ProgramEnrolment, TestProgramEnrolmentFactory.create({
                uuid: enrolment2Id,
                program: this.metadata.program,
                subject: this.subject,
                enrolmentDateTime: moment().add(-20, "day").toDate(),
                observations: [TestObsFactory.create({concept: this.concept, valueJSON: JSON.stringify(this.concept.getValueWrapperFor("dfds"))})],
                approvalStatuses: [enrolment2EAS]
            }));
            this.subject.addEnrolment(enrolment1);
            this.subject.addEnrolment(enrolment2);

            const program2Data = TestMetadataService.createProgram(db, this.metadata.subjectType, TestProgramFactory.create({name: "program 2"}));
            const program2EnrolmentId = General.randomUUID();
            const program2EnrolmentEAS = db.create(EntityApprovalStatus, TestEntityApprovalStatusFactory.create({
                entityType: EntityApprovalStatus.entityType.ProgramEnrolment,
                entityUUID: program2EnrolmentId,
                entityTypeUuid: program2Data.program.uuid,
                approvalStatus: this.metadata.approvedStatus
            }));
            program2Enrolment = db.create(ProgramEnrolment, TestProgramEnrolmentFactory.create({
                uuid: General.randomUUID(),
                program: program2Data.program,
                subject: this.subject,
                enrolmentDateTime: moment().add(-20, "day").toDate(),
                observations: [TestObsFactory.create({concept: this.concept, valueJSON: JSON.stringify(this.concept.getValueWrapperFor("dfds"))})],
                approvalStatuses: [program2EnrolmentEAS]
            }));
            this.subject.addEnrolment(program2Enrolment);
        });
        const entities = this.subject.getMemberEntitiesWithLatestStatus(this.metadata.approvedStatus.status);
        assert.equal(entities.length, 3);
        assert.equal(true, _.some(entities, (x) => x.uuid === enrolment1Id));
        assert.equal(true, _.some(entities, (x) => x.uuid === program2Enrolment.uuid));
    }

    getMemberEntitiesWithLatestStatus_WithoutApprovalStatuses() {
        this.executeInWrite((db) => {
            this.subject = db.create(Individual, TestSubjectFactory.createWithDefaults({
                uuid: General.randomUUID(),
                subjectType: this.metadata.subjectType,
                address: this.organisationData.addressLevel,
                firstName: "XYZ",
                lastName: "bar",
                observations: [TestObsFactory.create({concept: this.concept, valueJSON: JSON.stringify(this.concept.getValueWrapperFor("ABC"))})]
            }));
            const enrolment = db.create(ProgramEnrolment, TestProgramEnrolmentFactory.create({
                uuid: General.randomUUID(),
                program: this.metadata.program,
                subject: this.subject,
                enrolmentDateTime: moment().add(-10, "day").toDate(),
                observations: [TestObsFactory.create({concept: this.concept, valueJSON: JSON.stringify(this.concept.getValueWrapperFor("DEFPRG"))})]
            }));
            this.subject.addEnrolment(enrolment);
        });
        assert.equal(this.subject.getMemberEntitiesWithLatestStatus(this.metadata.approvedStatus.status).length, 0);
    }
}

export default IndividualIntegrationTest;
