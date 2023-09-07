import TestConceptFactory from "../test/model/TestConceptFactory";
import {Gender, Settings, Individual, OrganisationConfig, AddressLevel, Concept, Form, SubjectType, WorkList, WorkLists, FormMapping} from "openchs-models";
import BaseIntegrationTest from "./BaseIntegrationTest";
import TestFormFactory from "../test/model/form/TestFormFactory";
import TestFormElementGroupFactory from "../test/model/form/TestFormElementGroupFactory";
import TestFormElementFactory from "../test/model/form/TestFormElementFactory";
import TestSubjectTypeFactory from "../test/model/TestSubjectTypeFactory";
import TestAddressLevelFactory from "../test/model/TestAddressLevelFactory";
import {Actions} from "../src/action/individual/PersonRegisterActions";
import {AddNewMemberActions} from "../src/action/groupSubject/MemberAction";
import TestGenderFactory from "../test/model/TestGenderFactory";
import TestFormMappingFactory from "../test/model/form/TestFormMappingFactory";
import Reducers from "../src/reducer";
import TestOrganisationConfigFactory from "../test/model/TestOrganisationConfigFactory";
import TestSubjectFactory from "../test/model/txn/TestSubjectFactory";
import WorklistsFactory from "../src/model/WorklistsFactory";
import TestSettingsFactory from "../test/model/user/TestSettingsFactory";
import {assert} from 'chai';

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

const noOpRule = `({params, imports}) => {
    console.log("No Op Rule Started");
    const workLists = params.workLists;
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

    person_registration_should_show_worklist_correctly(context) {
        context.starting(arguments);
        let subjectType;
        this.executeInWrite((db) => {
            subjectType = db.create(SubjectType, TestSubjectTypeFactory.createWithDefaults({type: SubjectType.types.Person, name: 'Family Member'}));
            const form = db.create(Form, TestFormFactory.createWithDefaults({formType: Form.formTypes.IndividualProfile}));
            const formElementGroup = TestFormElementGroupFactory.create({form: form});
            TestFormElementFactory.create({concept: concept, displayOrder: 1, formElementGroup: formElementGroup});
            db.create(FormMapping, TestFormMappingFactory.createWithDefaults({subjectType: subjectType, form: form}))
            db.create(OrganisationConfig, TestOrganisationConfigFactory.createWithDefaults({worklistUpdationRule: rule}));
        });

        this.initialDataSetupComplete();

        const workLists = new WorkLists(new WorkList(subjectType.name).withRegistration(subjectType.name));
        this.dispatch({type: Actions.ON_LOAD, isDraftEntity: false, workLists: workLists});
        this.dispatch({type: Actions.REGISTRATION_ENTER_FIRST_NAME, value: "foo"});
        this.dispatch({type: Actions.REGISTRATION_ENTER_LAST_NAME, value: "bar"});
        this.dispatch({type: Actions.REGISTRATION_ENTER_GENDER, value: this.gender});
        this.dispatch({type: Actions.REGISTRATION_ENTER_DOB, value: new Date()});
        this.dispatch({type: Actions.REGISTRATION_ENTER_ADDRESS_LEVEL, value: this.addressLevel});
        this.dispatch({type: Actions.NEXT, completed: () => {}});
        const state = this.getState(Reducers.reducerKeys.personRegister);
        const workItems = state.workListState.workLists.currentWorkList.workItems;
        assert.equal("ENCOUNTER", workItems[1].type);
        assert.equal("Covid Survey", workItems[1].parameters.encounterType);
        context.ending(arguments);
    }

    person_registration_via_add_member_should_show_worklist_correctly(context) {
        context.starting(arguments);
        let householdSubjectType, personSubjectType, household;
        this.executeInWrite((db) => {
            householdSubjectType = db.create(SubjectType, TestSubjectTypeFactory.createWithDefaults({type: SubjectType.types.Household, name: 'Family', isGroup: true}));
            personSubjectType = db.create(SubjectType, TestSubjectTypeFactory.createWithDefaults({type: SubjectType.types.Person, name: 'Family Member', isGroup: false}));
            const form = db.create(Form, TestFormFactory.createWithDefaults({formType: Form.formTypes.IndividualProfile}));
            const formElementGroup = TestFormElementGroupFactory.create({form: form});
            TestFormElementFactory.create({concept: this.concept, displayOrder: 1, formElementGroup: formElementGroup});
            db.create(FormMapping, TestFormMappingFactory.createWithDefaults({subjectType: personSubjectType, form: form}))
            db.create(OrganisationConfig, TestOrganisationConfigFactory.createWithDefaults({worklistUpdationRule: noOpRule}));
            household = db.create(Individual, TestSubjectFactory.createWithDefaults({subjectType: householdSubjectType, firstName: "House1", address: this.addressLevel}));
        });

        this.initialDataSetupComplete();

        this.dispatch({type: AddNewMemberActions.ON_LOAD, groupSubject: household});
        const memberActionsState = this.getState(Reducers.reducerKeys.addNewMember);
        const workLists = WorklistsFactory.createForAddMemberStart(personSubjectType, memberActionsState.member, null, false, null);
        this.dispatch({type: Actions.ON_LOAD, isDraftEntity: false, workLists: workLists});
        this.dispatch({type: Actions.REGISTRATION_ENTER_FIRST_NAME, value: "foo"});
        this.dispatch({type: Actions.REGISTRATION_ENTER_LAST_NAME, value: "bar"});
        this.dispatch({type: Actions.REGISTRATION_ENTER_GENDER, value: this.gender});
        this.dispatch({type: Actions.REGISTRATION_ENTER_DOB, value: new Date()});
        this.dispatch({type: Actions.REGISTRATION_ENTER_ADDRESS_LEVEL, value: this.addressLevel});
        this.dispatch({type: Actions.NEXT, completed: () => {}});
        const state = this.getState(Reducers.reducerKeys.personRegister);
        const workItems = state.workListState.workLists.currentWorkList.workItems;
        assert.equal("ENCOUNTER", workItems[1].type);
        assert.equal("Covid Survey", workItems[1].parameters.encounterType);
        context.ending(arguments);
    }
}

export default PersonRegisterActionsIntegrationTest;
