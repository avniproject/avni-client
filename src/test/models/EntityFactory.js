import FormElementGroup from "../../js/models/application/FormElementGroup";
import Form from "../../js/models/application/Form";
import FormElement from "../../js/models/application/FormElement";
import _ from 'lodash';
import Concept from "../../js/models/Concept";

class EntityFactory {
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

    static createFormElement(name, mandatory, concept) {
        const formElement = new FormElement();
        formElement.name = name;
        formElement.mandatory = mandatory;
        formElement.concept = concept;
        return formElement;
    }

    static addCodedAnswers(concept, answers) {
        _.forEach(answers, (answer) => concept.addAnswer(Concept.create(answer, Concept.dataType.NA)));
    }
}

export default EntityFactory;