import TestConceptFactory from "../test/model/TestConceptFactory";
import {Gender, OrganisationConfig, AddressLevel, Concept, Form, SubjectType, WorkList, WorkLists, FormMapping} from "openchs-models";
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

const rule = `({params, imports}) => {
    const workLists = params.workLists;
    const context = params.context;
    const WorkItem = imports.models.WorkItem;
    const currentWorkItem = workLists.getCurrentWorkItem();
    const currentWorkList = workLists.currentWorkList;
    const age = _.get(context, 'entity.individual.age');
    console.log("In the rule");
    if (_.get(context, 'entity.individual.subjectType.name') === 'Family Member') {
        const uniqueID = (new Date()).toString(); 
        const covidSurvey = new WorkItem(uniqueID,
            WorkItem.type.ENCOUNTER,
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
    last_page_of_registration_should_show_worklist_correctly(context) {
        context.starting(arguments);
        let subjectType, gender, addressLevel;
        this.executeInWrite((db) => {
            const concept = db.create(Concept, TestConceptFactory.createWithDefaults({dataType: Concept.dataType.Text}));
            subjectType = db.create(SubjectType, TestSubjectTypeFactory.createWithDefaults({type: SubjectType.types.Person, name: 'Family Member'}));
            const form = db.create(Form, TestFormFactory.createWithDefaults({formType: Form.formTypes.IndividualProfile}));
            const formElementGroup = TestFormElementGroupFactory.create({form: form});
            TestFormElementFactory.create({concept: concept, displayOrder: 1, formElementGroup: formElementGroup});
            db.create(FormMapping, TestFormMappingFactory.createWithDefaults({subjectType: subjectType, form: form}))

            addressLevel = db.create(AddressLevel, TestAddressLevelFactory.createWithDefaults({level: 1}));
            gender = db.create(Gender, TestGenderFactory.createWithDefaults({name: "Male"}));
            db.create(OrganisationConfig, TestOrganisationConfigFactory.createWithDefaults({worklistUpdationRule: rule}));
        });

        this.initialDataSetupComplete();

        const workLists = new WorkLists(new WorkList(subjectType.name).withRegistration(subjectType.name));
        this.dispatch({type: Actions.ON_LOAD, isDraftEntity: false, workLists: workLists});
        this.dispatch({type: Actions.REGISTRATION_ENTER_FIRST_NAME, value: "foo"});
        this.dispatch({type: Actions.REGISTRATION_ENTER_LAST_NAME, value: "bar"});
        this.dispatch({type: Actions.REGISTRATION_ENTER_GENDER, value: gender});
        this.dispatch({type: Actions.REGISTRATION_ENTER_DOB, value: new Date()});
        this.dispatch({type: Actions.REGISTRATION_ENTER_ADDRESS_LEVEL, value: addressLevel});
        this.dispatch({type: Actions.NEXT, completed: () => {}});
        let state = this.getState(Reducers.reducerKeys.personRegister);
        console.log(state.workListState.workLists.currentWorkList.workItems);
        // this.dispatch({type: Actions.SAVE, cb: () => {}});
        context.ending(arguments);
    }
}

export default PersonRegisterActionsIntegrationTest;
