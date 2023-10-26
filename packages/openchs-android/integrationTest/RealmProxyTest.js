import BaseIntegrationTest from "./BaseIntegrationTest";
import {Observation} from "openchs-models";
import {assert} from "chai";
import TestObsFactory from "../test/model/TestObsFactory";

function shouldFail(baseIntegrationTest, obs, updateMode) {
    baseIntegrationTest.executeInWrite((db) => {
        try {
            db.create(Observation, obs, updateMode);
            assert.fail("Comment without subject and CommentThread should have failed to save.");
        } catch (error) {
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
}

export default RealmProxyTest;
