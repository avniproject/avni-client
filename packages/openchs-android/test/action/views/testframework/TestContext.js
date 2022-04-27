import StubbedMessageService from "../../service/stub/StubbedMessageService";
import StubbedConceptService from "../../service/stub/StubbedConceptService";
import StubbedIndividualService from "../../service/stub/StubbedIndividualService";
import StubbedFormMappingService from "../../service/stub/StubbedFormMappingService";
import StubbedProgramEnrolmentService from "../../service/stub/StubbedProgramEnrolmentService";
import _ from 'lodash';
import StubbedRuleEvaluationService from "../../service/stub/StubbedRuleEvaluationService";
import MessageService from "../../../../src/service/MessageService";
import ConceptService from "../../../../src/service/ConceptService";
import IndividualService from "../../../../src/service/IndividualService";
import FormMappingService from "../../../../src/service/FormMappingService";
import ProgramEnrolmentService from "../../../../src/service/ProgramEnrolmentService";
import RuleEvaluationService from "../../../../src/service/RuleEvaluationService";
import EncounterService from "../../../../src/service/EncounterService";
import StubbedEncounterService from "../../service/stub/StubbedEncounterService";
import EntityService from "../../../../src/service/EntityService";
import StubbedEntityService from "../../service/stub/StubbedEntityService";
import SettingsService from "../../../../src/service/SettingsService";
import StubbedSettingsService from "../../service/stub/StubbedSettingsService";
import UserInfoService from "../../../../src/service/UserInfoService";
import StubbedUserInfoService from "../../service/stub/StubbedUserInfoService";
import MediaQueueService from "../../../../src/service/MediaQueueService";
import StubbedMediaQueueService from "../../service/stub/StubbedMediaQueueService";
import IdentifierAssignmentService from "../../../../src/service/IdentifierAssignmentService";
import StubbedIdentifierAssignmentService from "../../service/stub/StubbedIdentifierAssignmentService";
import GroupSubjectService from "../../../../src/service/GroupSubjectService";
import StubbedGroupSubjectService from "../../service/stub/StubbedGroupSubjectService";
import PrivilegeService from "../../../../src/service/PrivilegeService";
import StubbedPrivilegeService from "../../service/stub/StubbedPrivilegeService";

class TestContext {
    static stubs = new Map([
        [MessageService, (serviceData) => new StubbedMessageService(serviceData)],
        [ConceptService, (serviceData) => new StubbedConceptService(serviceData)],
        [IndividualService, (serviceData) => new StubbedIndividualService(serviceData)],
        [FormMappingService, (serviceData) => new StubbedFormMappingService(serviceData)],
        [ProgramEnrolmentService, (serviceData) => new StubbedProgramEnrolmentService(serviceData)],
        [RuleEvaluationService, (serviceData) => new StubbedRuleEvaluationService(serviceData)],
        [EncounterService, (serviceData) => new StubbedEncounterService(serviceData)],
        [EntityService, (serviceData) => new StubbedEntityService(serviceData)],
        [SettingsService, (serviceData) => new StubbedSettingsService(serviceData)],
        [UserInfoService, (serviceData) => new StubbedUserInfoService(serviceData)],
        [MediaQueueService, (serviceData) => new StubbedMediaQueueService(serviceData)],
        [IdentifierAssignmentService, (serviceData) => new StubbedIdentifierAssignmentService(serviceData)],
        [GroupSubjectService, (serviceData) => new StubbedGroupSubjectService(serviceData)],
        [PrivilegeService, (serviceData) => new StubbedPrivilegeService(serviceData)]
    ]);

    constructor(serviceData) {
        this.serviceData = serviceData;
    }

    getService(type) {
        const stub = TestContext.stubs.get(type);
        if (_.isNil(stub)) {
            return {
                getDecisions: function () {
                    return [{
                        name: "Treatment Advice",
                        code: "ABC001",
                        value: "The patient should be referred to the hospital immediately as he may having tuberculosis",
                        alert: "ALERT MESSAGE"
                    }]
                }
            };
        }
        return stub(this.serviceData);
    }

    get(type) {
        return this.getBean(type);
    }

    getBean(type) {
        return this.getService(type);
    }

    navigator() {
        return {
            pop: function () {
            }
        }
    }
}

export default TestContext;
