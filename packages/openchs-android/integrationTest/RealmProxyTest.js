import BaseIntegrationTest from "./BaseIntegrationTest";
import {AddressLevel, Concept, Individual, SubjectType} from "openchs-models";
import {assert} from "chai";
import TestObsFactory from "../test/model/TestObsFactory";
import TestSubjectFactory from "../test/model/txn/TestSubjectFactory";
import TestAddressLevelFactory from "../test/model/TestAddressLevelFactory";
import moment from "moment/moment";
import TestSubjectTypeFactory from "../test/model/TestSubjectTypeFactory";
import TestConceptFactory from '../test/model/TestConceptFactory';

function shouldFail(baseIntegrationTest, obs, updateMode) {
    baseIntegrationTest.executeInWrite((db) => {
        try {
            db.create(Concept, obs, updateMode);
            assert.fail("Comment without subject and CommentThread should have failed to save.");
        } catch (error) {
        }
    });
}

function shouldFailSubjectCreationWithoutSubjectType(baseIntegrationTest, sub, updateMode) {
    baseIntegrationTest.executeInWrite((db) => {
        try {
            let savedAddressLevel = db.create(AddressLevel, TestAddressLevelFactory.createWithDefaults({level: 1}));
            sub.lowestAddressLevel = savedAddressLevel;
            db.create(Individual, sub, updateMode);
            assert.fail("Subject without subjectType should have failed to save.");
        } catch (error) {
            console.error(error)
        }
    });
}
function shouldFailSubjectCreationWithoutAddress(baseIntegrationTest, sub, updateMode) {
    baseIntegrationTest.executeInWrite((db) => {
        try {
            let newSubjectType = db.create(SubjectType, TestSubjectTypeFactory.createWithDefaults({type: SubjectType.types.Person, name: 'Beneficiary'}));
            sub.subjectType = newSubjectType;
            db.create(Individual, sub, updateMode);
            assert.fail("Subject without addressLevel should have failed to save.");
        } catch (error) {
            console.error(error)
        }
    });
}

function conceptNameShouldRemainSameOnEntityObservationSave(baseIntegrationTest, updateMode) {
    baseIntegrationTest.executeInWrite((db) => {
        const originalConceptName = 'concept-1';
        try {

            //Init subjectType and concept
            const subjectType = db.create(SubjectType, TestSubjectTypeFactory.createWithDefaults({type: SubjectType.types.Person, name: 'Beneficiary'}));
            const originalConcept = db.create(Concept, TestConceptFactory.createWithDefaults({
                name: originalConceptName,
                dataType: Concept.dataType.Text, keyValues: [{key: "subjectTypeUUID", value: "c47088d6-ac67-4e4d-b5af-158468a83202"}]
            }), updateMode);
            assert.isNotNull(originalConcept);
            const savedAddressLevel = db.create(AddressLevel, TestAddressLevelFactory.createWithDefaults({level: 1}));

            assert.equal(originalConcept.keyValues.length, 1);
            assert.equal(originalConcept.keyValues[0].key, "subjectTypeUUID");
            assert.equal(originalConcept.keyValues[0].getValue(), 'c47088d6-ac67-4e4d-b5af-158468a83202');

            //Clone and modify the concept name
            const originalConceptClone = originalConcept.cloneForReference();
            const modifiedConceptName = originalConcept.name + "modified";
            originalConceptClone.name = modifiedConceptName;

            //Create Individual
            const individual = db.create(Individual, TestSubjectFactory.createWithDefaults({
                subjectType,
                address: savedAddressLevel,
                firstName: "XYZ",
                lastName: "bar",
                observations: [TestObsFactory.create({concept: originalConceptClone, valueJSON: JSON.stringify(originalConceptClone.getValueWrapperFor("ABC"))})],
                approvalStatuses: []
            }), updateMode);

            assert.isNotNull(individual);
            //Fetch the concept from db again
            const modifiedConcept = db.objectForPrimaryKey(Concept, originalConcept.uuid);

            //Concept name would have changed
            assert.equal(modifiedConceptName, modifiedConcept.name);

            //Concept should not have lost its key and value
            assert.equal(modifiedConcept.keyValues[0].key, "subjectTypeUUID");
            assert.equal(modifiedConcept.keyValues[0].getValue(), 'c47088d6-ac67-4e4d-b5af-158468a83202');
        } catch (error) {
            throw error;
            // assert.fail(error.message);
        }
    });
}


function shouldPass(baseIntegrationTest, obs, updateMode) {
    baseIntegrationTest.executeInWrite((db) => {
        db.create(Concept, obs, updateMode);
    });
}

class RealmProxyTest extends BaseIntegrationTest {
    doNotAllowCreateWithMandatoryObjectTypePropertyAsNull() {
        shouldFail(this, TestConceptFactory.createWithDefaults({dataType: null}), false);
        shouldPass(this, TestConceptFactory.createWithDefaults({dataType: Concept.dataType.Text}), false);
    }

    doNotAllowCreationOfIndividualWithoutSubjectType() {
        shouldFailSubjectCreationWithoutSubjectType(this,
            TestSubjectFactory.createWithDefaults({firstName:'foo',  lastName:'bar', address:null, registrationDate: moment().toDate(), observations:[]}),
            false)
    }

    doNotAllowCreationOfIndividualWithoutAddressLevel() {
        shouldFailSubjectCreationWithoutAddress(this,
            TestSubjectFactory.createWithDefaults({firstName:'foo',  lastName:'bar', address:null, registrationDate: moment().toDate(), observations:[]}),
            false)
    }

    saveOfEntityObservationShouldNotCascadeToConcept() {
        conceptNameShouldRemainSameOnEntityObservationSave(this, true);
    }

}

export default RealmProxyTest;
