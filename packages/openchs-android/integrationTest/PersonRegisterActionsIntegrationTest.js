import TestConceptFactory from "../test/model/TestConceptFactory";
import {
    AddressLevel,
    Concept,
    Form,
    FormElement,
    FormElementGroup,
    FormMapping,
    Gender,
    Individual,
    OrganisationConfig,
    Settings,
    SubjectType,
    WorkList,
    WorkLists
} from "openchs-models";
import BaseIntegrationTest from "./BaseIntegrationTest";
import TestFormFactory from "../test/model/form/TestFormFactory";
import TestFormElementGroupFactory from "../test/model/form/TestFormElementGroupFactory";
import TestFormElementFactory from "../test/model/form/TestFormElementFactory";
import TestSubjectTypeFactory from "../test/model/TestSubjectTypeFactory";
import TestAddressLevelFactory from "../test/model/TestAddressLevelFactory";
import {Actions} from "../src/action/individual/PersonRegisterActions";
import TestGenderFactory from "../test/model/TestGenderFactory";
import TestFormMappingFactory from "../test/model/form/TestFormMappingFactory";
import Reducers from "../src/reducer";
import TestOrganisationConfigFactory from "../test/model/TestOrganisationConfigFactory";
import TestSettingsFactory from "../test/model/user/TestSettingsFactory";
import {assert} from 'chai';
import TestSubjectFactory from "../test/model/txn/TestSubjectFactory";
import TestObsFactory from "../test/model/TestObsFactory";
import TestKeyValueFactory from "../test/model/TestKeyValueFactory";
import TestMetadataService from "./service/TestMetadataService";
import {clearTestState} from "realm";
import General from "../src/utility/General";

const rule = `({params, imports}) => {
    console.log('[WorklistRule] Rule executing');
    const workLists = params.workLists;
    const context = params.context;
    const WorkItem = imports.models.WorkItem;
    const currentWorkItem = workLists.getCurrentWorkItem();
    const currentWorkList = workLists.currentWorkList;
    const age = _.get(context, 'entity.individual.age');
    const subjectTypeName = _.get(context, 'entity.individual.subjectType.name');
    console.log('[WorklistRule] Subject type:', subjectTypeName);
    if (subjectTypeName === 'Family Member') {
        console.log('[WorklistRule] Adding Covid Survey work item');
        const uniqueID = (new Date()).toString(); 
        const covidSurvey = new WorkItem(uniqueID, WorkItem.type.ENCOUNTER,
            {
                encounterType: 'Covid Survey',
                subjectUUID: _.get(context, 'entity.individual.uuid')
            });
        const totalItems = _.size(currentWorkList.workItems);
        console.log('[WorklistRule] Total items before:', totalItems);
        currentWorkList.workItems.splice(totalItems - 1, 0, covidSurvey);
        console.log('[WorklistRule] Total items after:', currentWorkList.workItems.length);
    }
    return workLists;
};`;

const formElementRule = `'use strict';
({params, imports}) => {  
  return new imports.rulesConfig.FormElementStatus(params.formElement.uuid, true, "20", [], []);
};
`;

class PersonRegisterActionsIntegrationTest extends BaseIntegrationTest {
    concept; addressLevel; gender;

    setup() {
        super.setup();
        this.executeInWrite((db) => {
            this.concept = db.create(Concept, TestConceptFactory.createWithDefaults({dataType: Concept.dataType.Text}));
            this.addressLevel = db.create(AddressLevel, TestAddressLevelFactory.createWithDefaults({level: 1, type: "1"}));
            this.gender = db.create(Gender, TestGenderFactory.createWithDefaults({name: "Male"}));
            db.create(Settings, TestSettingsFactory.createWithDefaults({}));
        });
        return this;
    }

    async person_registration_should_show_worklist_correctly() {
        let subjectType;
        this.executeInWrite((db) => {
            subjectType = TestMetadataService.createSubjectType(db, TestSubjectTypeFactory.createWithDefaults({type: SubjectType.types.Person, name: 'Family Member'})).subjectType;
            db.create(OrganisationConfig, TestOrganisationConfigFactory.createWithDefaults({worklistUpdationRule: rule}));
        });

        this.initialDataSetupComplete();

        const workLists = new WorkLists(new WorkList(subjectType.name).withRegistration(subjectType.name));
        this.dispatch({type: Actions.ON_LOAD, isDraftEntity: false, workLists: workLists});
        this.dispatch({type: Actions.REGISTRATION_ENTER_FIRST_NAME, value: "baz"});
        this.dispatch({type: Actions.REGISTRATION_ENTER_LAST_NAME, value: "kal"});
        this.dispatch({type: Actions.REGISTRATION_ENTER_GENDER, value: this.gender});
        this.dispatch({type: Actions.REGISTRATION_ENTER_DOB, value: new Date()});
        this.dispatch({type: Actions.REGISTRATION_ENTER_ADDRESS_LEVEL, value: this.addressLevel});
        
        const completedState = await this.dispatchAndWaitForCompletion({type: Actions.NEXT});
        
        // Check state after async completion
        const workItems = completedState.workListState.workLists.currentWorkList.workItems;
        console.log("WorkItems length:", workItems.length);
        console.log("WorkItems:", JSON.stringify(workItems.map(wi => ({type: wi.type, parameters: wi.parameters})), null, 2));
        assert.isAtLeast(workItems.length, 2, "Expected at least 2 work items");
        assert.equal("ENCOUNTER", workItems[1].type);
        assert.equal("Covid Survey", workItems[1].parameters.encounterType);
    }

    async unique_field_in_form() {
        let subjectType, formElement;
        this.executeInWrite((db) => {
            subjectType = db.create(SubjectType, TestSubjectTypeFactory.createWithDefaults({type: SubjectType.types.Person, name: 'Beneficiary'}));
            const form = db.create(Form, TestFormFactory.createWithDefaults({formType: Form.formTypes.IndividualProfile}));
            const formElementGroup = db.create(FormElementGroup, TestFormElementGroupFactory.create({form: form}));
            formElement = db.create(FormElement, TestFormElementFactory.create({
                uuid: "FOO",
                concept: this.concept,
                displayOrder: 1,
                formElementGroup: formElementGroup,
                mandatory: true,
                keyValues: [TestKeyValueFactory.create({key: "unique", value: "true"})]
            }));
            db.create(FormMapping, TestFormMappingFactory.createWithDefaults({subjectType: subjectType, form: form}));
            db.create(OrganisationConfig, TestOrganisationConfigFactory.createWithDefaults({}));

            db.create(Individual, TestSubjectFactory.createWithDefaults({subjectType: subjectType, address: this.addressLevel, firstName: "foo", lastName: "bar", observations: [TestObsFactory.create({concept: this.concept, valueJSON: JSON.stringify(this.concept.getValueWrapperFor("ABC"))})]}));
        });

        this.initialDataSetupComplete();
        formElement = this.getEntity(FormElement, formElement.uuid);

        const workLists = new WorkLists(new WorkList(subjectType.name).withRegistration(subjectType.name));
        this.dispatch({type: Actions.ON_LOAD, isDraftEntity: false, workLists: workLists});
        this.dispatch({type: Actions.REGISTRATION_ENTER_FIRST_NAME, value: "baz"});
        this.dispatch({type: Actions.REGISTRATION_ENTER_LAST_NAME, value: "kal"});
        this.dispatch({type: Actions.REGISTRATION_ENTER_GENDER, value: this.gender});
        this.dispatch({type: Actions.REGISTRATION_ENTER_DOB, value: new Date()});
        this.dispatch({type: Actions.REGISTRATION_ENTER_ADDRESS_LEVEL, value: this.addressLevel});
        
        await this.dispatchAndWaitForCompletion({type: Actions.NEXT});

        this.dispatch({type: Actions.PRIMITIVE_VALUE_CHANGE, formElement: formElement, value: "ABC"});
        const state1 = await this.dispatchAndWaitForCompletion({type: Actions.NEXT});
        assert.equal(state1.validationResults[0].messageKey, "duplicateValue");

        this.dispatch({type: Actions.PRIMITIVE_VALUE_CHANGE, formElement: formElement, value: "ABC"});
        const state2 = await this.dispatchAndWaitForCompletion({type: Actions.NEXT});
        assert.equal(state2.validationResults[0].messageKey, "duplicateValue");

        this.dispatch({type: Actions.PRIMITIVE_VALUE_CHANGE, formElement: formElement, value: "EFG"});
        const state3 = await this.dispatchAndWaitForCompletion({type: Actions.NEXT});
        assert.equal(state3.validationResults.length, 0);
    }

    async rule_generated_field_edited_by_user() {
        function getValue(test) {
            return test.getState(Reducers.reducerKeys.personRegister).individual.observations[0].valueJSON.value;
        }

        let subjectType, formElement;
        this.executeInWrite((db) => {
            subjectType = db.create(SubjectType, TestSubjectTypeFactory.createWithDefaults({type: SubjectType.types.Person, name: 'Beneficiary'}));
            const form = db.create(Form, TestFormFactory.createWithDefaults({formType: Form.formTypes.IndividualProfile}));
            const formElementGroup = db.create(FormElementGroup, TestFormElementGroupFactory.create({form: form}));
            formElement = db.create(FormElement, TestFormElementFactory.create({
                uuid: "FOO",
                concept: this.concept,
                displayOrder: 1,
                formElementGroup: formElementGroup,
                rule: formElementRule
            }));
            db.create(FormMapping, TestFormMappingFactory.createWithDefaults({subjectType: subjectType, form: form}));
            db.create(OrganisationConfig, TestOrganisationConfigFactory.createWithDefaults({}));

            db.create(Individual, TestSubjectFactory.createWithDefaults({subjectType: subjectType, address: this.addressLevel, firstName: "foo", lastName: "bar", observations: [TestObsFactory.create({concept: this.concept, valueJSON: JSON.stringify(this.concept.getValueWrapperFor("ABC"))})]}));
        });

        this.initialDataSetupComplete();

        const workLists = new WorkLists(new WorkList(subjectType.name).withRegistration(subjectType.name));
        this.dispatch({type: Actions.ON_LOAD, isDraftEntity: false, workLists: workLists});
        this.dispatch({type: Actions.REGISTRATION_ENTER_FIRST_NAME, value: "baz"});
        this.dispatch({type: Actions.REGISTRATION_ENTER_LAST_NAME, value: "kal"});
        this.dispatch({type: Actions.REGISTRATION_ENTER_GENDER, value: this.gender});
        this.dispatch({type: Actions.REGISTRATION_ENTER_DOB, value: new Date()});
        this.dispatch({type: Actions.REGISTRATION_ENTER_ADDRESS_LEVEL, value: this.addressLevel});
        
        await this.dispatchAndWaitForCompletion({type: Actions.NEXT});
        
        formElement = this.getEntity(FormElement, formElement.uuid);
        this.dispatch({type: Actions.PRIMITIVE_VALUE_CHANGE, formElement: formElement, value: ""});
        
        const finalState = this.getState(Reducers.reducerKeys.personRegister);
        assert.isNotEmpty(finalState.individual.observations, "Expected observations to exist");
        General.logDebugTempJson("", finalState.individual.observations[0].valueJSON.value);
    }
}

export default PersonRegisterActionsIntegrationTest;
