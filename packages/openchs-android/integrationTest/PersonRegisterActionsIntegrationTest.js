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

const rule = `({params, imports}) => {
    const workLists = params.workLists;
    const context = params.context;
    const WorkItem = imports.models.WorkItem;
    const currentWorkItem = workLists.getCurrentWorkItem();
    const currentWorkList = workLists.currentWorkList;
    const age = _.get(context, 'entity.individual.age');
    if (_.get(context, 'entity.individual.subjectType.name') === 'Family Member') {
        const uniqueID = (new Date()).toString(); 
        const covidSurvey = new WorkItem(uniqueID, WorkItem.type.ENCOUNTER,
            {
                encounterType: 'Covid Survey',
                subjectUUID: _.get(context, 'entity.individual.uuid')
            });
        const totalItems = _.size(currentWorkList.workItems);    
        currentWorkList.workItems.splice(totalItems - 1, 0, covidSurvey);
    }
    return workLists;
};`;

class PersonRegisterActionsIntegrationTest extends BaseIntegrationTest {
    concept; addressLevel; gender;

    setup() {
        super.setup();
        this.executeInWrite((db) => {
            this.concept = db.create(Concept, TestConceptFactory.createWithDefaults({dataType: Concept.dataType.Text}));
            this.addressLevel = db.create(AddressLevel, TestAddressLevelFactory.createWithDefaults({level: 1}));
            this.gender = db.create(Gender, TestGenderFactory.createWithDefaults({name: "Male"}));
            db.create(Settings, TestSettingsFactory.createWithDefaults({}));
        });
        return this;
    }

    person_registration_should_show_worklist_correctly() {
        let subjectType;
        this.executeInWrite((db) => {
            subjectType = db.create(SubjectType, TestSubjectTypeFactory.createWithDefaults({type: SubjectType.types.Person, name: 'Family Member'}));
            const form = db.create(Form, TestFormFactory.createWithDefaults({formType: Form.formTypes.IndividualProfile}));
            db.create(FormMapping, TestFormMappingFactory.createWithDefaults({subjectType: subjectType, form: form}))
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
        this.dispatch({type: Actions.NEXT, completed: () => {}});
        const state = this.getState(Reducers.reducerKeys.personRegister);
        const workItems = state.workListState.workLists.currentWorkList.workItems;
        assert.equal("ENCOUNTER", workItems[1].type);
        assert.equal("Covid Survey", workItems[1].parameters.encounterType);
    }

    unique_field_in_form() {
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
            db.create(OrganisationConfig, TestOrganisationConfigFactory.createWithDefaults({worklistUpdationRule: rule}));

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
        this.dispatch({type: Actions.NEXT, completed: () => {}});

        this.dispatch({type: Actions.PRIMITIVE_VALUE_CHANGE, formElement: formElement, value: "ABC"});
        assert.equal(this.getState(Reducers.reducerKeys.personRegister).validationResults[0].messageKey, "duplicateValue");
        this.dispatch({type: Actions.NEXT, completed: () => {}});
        assert.equal(this.getState(Reducers.reducerKeys.personRegister).validationResults[0].messageKey, "duplicateValue");

        this.dispatch({type: Actions.PRIMITIVE_VALUE_CHANGE, formElement: formElement, value: "ABC"});
        assert.equal(this.getState(Reducers.reducerKeys.personRegister).validationResults[0].messageKey, "duplicateValue");
        this.dispatch({type: Actions.NEXT, completed: () => {}});
        assert.equal(this.getState(Reducers.reducerKeys.personRegister).validationResults[0].messageKey, "duplicateValue");

        this.dispatch({type: Actions.PRIMITIVE_VALUE_CHANGE, formElement: formElement, value: "EFG"});
        assert.equal(this.getState(Reducers.reducerKeys.personRegister).validationResults.length, 0);
        this.dispatch({type: Actions.NEXT, completed: () => {}});
        assert.equal(this.getState(Reducers.reducerKeys.personRegister).validationResults.length, 0);
    }
}

export default PersonRegisterActionsIntegrationTest;
