import BaseIntegrationTest from "./BaseIntegrationTest";
import {Concept, EntityApprovalStatus, Individual, ProgramEnrolment} from "openchs-models";
import TestEntityApprovalStatusFactory from "../test/model/approval/TestEntityApprovalStatusFactory";
import TestSubjectFactory from "../test/model/txn/TestSubjectFactory";
import TestObsFactory from "../test/model/TestObsFactory";
import General from "../src/utility/General";
import TestOrganisationService from "./service/TestOrganisationService";
import TestMetadataService from "./service/TestMetadataService";
import EntityApprovalStatusService from "../src/service/EntityApprovalStatusService";
import {assert} from "chai";
import TestConceptFactory from "../test/model/TestConceptFactory";
import {JSONStringify} from "../src/utility/JsonStringify";
import TestProgramEnrolmentFactory from "../test/model/txn/TestProgramEnrolmentFactory";
import moment from "moment/moment";

class EntityApprovalServiceTest extends BaseIntegrationTest {
    setup(): this {
        super.setup();
        this.executeInWrite((db) => {
            this.organisationData = TestOrganisationService.setupOrganisation(db);
            this.concept = db.create(Concept, TestConceptFactory.createWithDefaults({dataType: Concept.dataType.Text}));
            this.metadata = TestMetadataService.create(db);

            const subject1Id = General.randomUUID();
            const subject2Id = General.randomUUID();
            const subject3Id = General.randomUUID();
            const enrolmentId = General.randomUUID();

            const subject1EAS = db.create(EntityApprovalStatus, TestEntityApprovalStatusFactory.create({
                entityType: EntityApprovalStatus.entityType.Subject,
                entityUUID: subject1Id,
                entityTypeUuid: this.metadata.subjectType.uuid,
                approvalStatus: this.metadata.approvedStatus
            }));
            db.create(Individual, TestSubjectFactory.createWithDefaults({
                uuid: subject1Id,
                subjectType: this.metadata.subjectType,
                address: this.organisationData.addressLevel,
                firstName: "XYZ",
                lastName: "bar",
                observations: [TestObsFactory.create({concept: this.concept, valueJSON: JSON.stringify(this.concept.getValueWrapperFor("ABC"))})],
                approvalStatuses: [subject1EAS]
            }));

            const subject2EAS = db.create(EntityApprovalStatus, TestEntityApprovalStatusFactory.create({
                entityType: EntityApprovalStatus.entityType.Subject,
                entityUUID: subject2Id,
                entityTypeUuid: this.metadata.subjectType.uuid,
                approvalStatus: this.metadata.approvedStatus
            }));
            db.create(Individual, TestSubjectFactory.createWithDefaults({
                uuid: subject2Id,
                subjectType: this.metadata.subjectType,
                address: this.organisationData.addressLevel2,
                firstName: "ABC",
                lastName: "bar2",
                observations: [TestObsFactory.create({concept: this.concept, valueJSON: JSON.stringify(this.concept.getValueWrapperFor("DEF"))})],
                approvalStatuses: [subject2EAS]
            }));

            this.subject3 = db.create(Individual, TestSubjectFactory.createWithDefaults({
                uuid: subject3Id,
                subjectType: this.metadata.subjectType,
                address: this.organisationData.addressLevel2,
                firstName: "EFG",
                lastName: "bar2",
                observations: [TestObsFactory.create({concept: this.concept, valueJSON: JSON.stringify(this.concept.getValueWrapperFor("DEF"))})],
                approvalStatuses: []
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
                subject: this.subject3,
                enrolmentDateTime: moment().add(-10, "day").toDate(),
                latestEntityApprovalStatus: null,
                observations: [TestObsFactory.create({concept: this.concept, valueJSON: JSON.stringify(this.concept.getValueWrapperFor("DEFPRG"))})],
                approvalStatuses: [enrolmentEAS]
            }));
            this.subject3.addEnrolment(enrolment);
        });

        this.service = this.getService(EntityApprovalStatusService);
    }

    getSubjectEASes() {
        const subjects = this.service.getAllSubjects(this.metadata.approvedStatus.status, null);
        assert.equal(subjects.length, 3);
        assert.equal(subjects[0].firstName, "ABC");
        assert.equal(subjects[1].firstName, "EFG");
        assert.equal(subjects[2].firstName, "XYZ");
    }

    getSubjectsEASesForAnEntityType() {
        const subjects = this.service.getAllSubjects(this.metadata.approvedStatus.status, null, this.metadata.subjectTypeFormMapping);
        assert.equal(subjects.length, 2);
        assert.equal(subjects[0].firstName, "ABC");
        assert.equal(subjects[1].firstName, "XYZ");
    }
}

export default EntityApprovalServiceTest;
