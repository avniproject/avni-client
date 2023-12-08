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
        this.executeInWrite((db) => {
            const subject1Id = General.randomUUID();
            const enrolmentId = General.randomUUID();

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
            const enrolmentEAS = db.create(EntityApprovalStatus, TestEntityApprovalStatusFactory.create({
                entityType: EntityApprovalStatus.entityType.ProgramEnrolment,
                entityUUID: enrolmentId,
                entityTypeUuid: this.metadata.program.uuid,
                approvalStatus: this.metadata.approvedStatus
            }));
            const enrolment = db.create(ProgramEnrolment, TestProgramEnrolmentFactory.create({
                uuid: enrolmentId,
                program: this.metadata.program,
                subject: this.subject,
                enrolmentDateTime: moment().add(-10, "day").toDate(),
                observations: [TestObsFactory.create({concept: this.concept, valueJSON: JSON.stringify(this.concept.getValueWrapperFor("DEFPRG"))})],
                approvalStatuses: [enrolmentEAS]
            }));
            this.subject.addEnrolment(enrolment);
        });
        assert.equal(this.subject.getMemberEntitiesWithLatestStatus(this.metadata.approvedStatus.status).length, 2);
    }

    getMemberEntitiesWithLatestStatus_WithoutApprovalStatuses() {
        this.executeInWrite((db) => {
            const subject1Id = General.randomUUID();
            const enrolmentId = General.randomUUID();

            this.subject = db.create(Individual, TestSubjectFactory.createWithDefaults({
                uuid: subject1Id,
                subjectType: this.metadata.subjectType,
                address: this.organisationData.addressLevel,
                firstName: "XYZ",
                lastName: "bar",
                observations: [TestObsFactory.create({concept: this.concept, valueJSON: JSON.stringify(this.concept.getValueWrapperFor("ABC"))})]
            }));
            const enrolment = db.create(ProgramEnrolment, TestProgramEnrolmentFactory.create({
                uuid: enrolmentId,
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
