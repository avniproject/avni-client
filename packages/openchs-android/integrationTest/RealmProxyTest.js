import BaseIntegrationTest from "./BaseIntegrationTest";
import {AddressLevel, Observation, Individual, SubjectType} from "openchs-models";
import {assert} from "chai";
import TestObsFactory from "../test/model/TestObsFactory";
import TestSubjectFactory from "../test/model/txn/TestSubjectFactory";
import TestAddressLevelFactory from "../test/model/TestAddressLevelFactory";
import moment from "moment/moment";
import TestSubjectTypeFactory from "../test/model/TestSubjectTypeFactory";

function shouldFail(baseIntegrationTest, obs, updateMode) {
    baseIntegrationTest.executeInWrite((db) => {
        try {
            db.create(Observation, obs, updateMode);
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

function shouldPass(baseIntegrationTest, obs, updateMode) {
    baseIntegrationTest.executeInWrite((db) => {
        db.create(Observation, obs, updateMode);
    });
}

class RealmProxyTest extends BaseIntegrationTest {
    doNotAllowCreateWithMandatoryObjectTypePropertyAsNull() {
        shouldFail(this, TestObsFactory.create({valueJSON: "{}"}), false);
        shouldFail(this, TestObsFactory.create({concept: null, valueJSON: "{}"}), true);
        shouldPass(this, TestObsFactory.create({valueJSON: "{}"}), true);
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
}

export default RealmProxyTest;
