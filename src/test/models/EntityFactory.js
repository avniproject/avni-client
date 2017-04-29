import FormElementGroup from "../../js/models/application/FormElementGroup";
import Form from "../../js/models/application/Form";
import FormElement from "../../js/models/application/FormElement";
import _ from 'lodash';
import Concept from "../../js/models/Concept";
import Program from "../../js/models/Program";
import General from '../../js/utility/General';
import IndividualSearchCriteria from "../../js/service/query/IndividualSearchCriteria";
import ChecklistItem from "../../js/models/ChecklistItem";

class EntityFactory {
    static createSafeProgram(name) {
        const program = new Program();
        program.uuid = General.randomUUID();
        program.name = name;
        return program;
    }

    static createSafeFormElementGroup(form) {
        const formElementGroup = new FormElementGroup();
        formElementGroup.formElements = [];
        formElementGroup.form = form;
        form.addFormElementGroup(formElementGroup);
        return formElementGroup;
    }

    static createFormElementGroup(name, displayOrder, form) {
        const formElementGroup = EntityFactory.createSafeFormElementGroup(form);
        formElementGroup.name = name;
        formElementGroup.displayOrder = displayOrder;
        return formElementGroup;
    }

    static createForm(name) {
        const form = new Form();
        form.name = name;
        form.formElementGroups = [];
        return form;
    }

    static createFormElement(name, mandatory, concept, displayOrder) {
        const formElement = new FormElement();
        formElement.uuid = General.randomUUID();
        formElement.name = name;
        formElement.mandatory = mandatory;
        formElement.concept = concept;
        formElement.displayOrder = displayOrder;
        return formElement;
    }

    static addCodedAnswers(concept, answers) {
        _.forEach(answers, (answer) => concept.addAnswer(EntityFactory.createConcept(answer, Concept.dataType.NA)));
    }

    static createConcept(name, dataType) {
        const concept = Concept.create(name, dataType);
        if (dataType === Concept.dataType.Coded)
            concept.answers = [];
        return concept;
    }

    static createIndividualSearchCriteria(name, age, lowestAddressLevels) {
        const individualSearchCriteria = IndividualSearchCriteria.empty();
        individualSearchCriteria.name = name;
        individualSearchCriteria.ageInYears = age;
        individualSearchCriteria.lowestAddressLevels = lowestAddressLevels;
        return individualSearchCriteria;
    }

    static addChecklistItem(checklist, name, dueDate) {
        const item = ChecklistItem.create();
        item.concept = Concept.create(name, Concept.dataType.NA);
        item.dueDate = dueDate;
        checklist.addItem(item);
        return item;
    }
}

export default EntityFactory;