import BaseIntegrationTest from "./BaseIntegrationTest";
import {imageObservationDoesNotExist} from "../src/task/PruneMedia";
import TestOrganisationService from "./service/TestOrganisationService";
import {Concept, Individual, ProgramEnrolment} from "openchs-models";
import TestConceptFactory from "../test/model/TestConceptFactory";
import TestMetadataService from "./service/TestMetadataService";
import TestSubjectFactory from "../test/model/txn/TestSubjectFactory";
import TestObsFactory from "../test/model/TestObsFactory";
import TestProgramEnrolmentFactory from "../test/model/txn/TestProgramEnrolmentFactory";
import {assert} from "chai";

class PruneMediaIntegrationTest extends BaseIntegrationTest {
    check_image_doesnt_exist() {
        this.executeInWrite((db) => {
            this.organisationData = TestOrganisationService.setupOrganisation(db);
            const concept1 = db.create(Concept, TestConceptFactory.createWithDefaults({dataType: Concept.dataType.Image}));
            const concept2 = db.create(Concept, TestConceptFactory.createWithDefaults({dataType: Concept.dataType.Text}));
            const concept3 = db.create(Concept, TestConceptFactory.createWithDefaults({dataType: Concept.dataType.Text}));
            this.metadata = TestMetadataService.create(db);

            const subject = db.create(Individual, TestSubjectFactory.createWithDefaults({
                subjectType: this.metadata.subjectType,
                address: this.organisationData.addressLevel,
                firstName: "XYZ",
                lastName: "bar",
                observations: [
                    TestObsFactory.create({concept: concept1, valueJSON: JSON.stringify(concept1.getValueWrapperFor("foo.jpg"))}),
                    TestObsFactory.create({concept: concept2, valueJSON: JSON.stringify(concept2.getValueWrapperFor("bar"))}),
                    TestObsFactory.create({concept: concept3, valueJSON: JSON.stringify(concept3.getValueWrapperFor("baz"))})
                ]
            }));

            const enrolment = db.create(ProgramEnrolment, TestProgramEnrolmentFactory.create({
                program: this.metadata.program,
                subject: subject,
                latestEntityApprovalStatus: null,
                observations: [
                    TestObsFactory.create({concept: concept1, valueJSON: JSON.stringify(concept1.getValueWrapperFor("abc.jpg"))}),
                    TestObsFactory.create({concept: concept2, valueJSON: JSON.stringify(concept1.getValueWrapperFor("xyz"))})
                ]
            }));
            subject.addEnrolment(enrolment);
        });

        const db = this.getDb();
        const doesNotExist = imageObservationDoesNotExist(db);
        assert.equal(false, doesNotExist("foo.jpg"));
        assert.equal(false, doesNotExist("abc.jpg"));
        assert.equal(true, doesNotExist("yyy.jpg"));
        assert.equal(true, doesNotExist("bar"));
    }
}

export default PruneMediaIntegrationTest;
