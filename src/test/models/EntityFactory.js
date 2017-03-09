import FormElementGroup from "../../js/models/application/FormElementGroup";
import Form from "../../js/models/application/Form";

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
}

export default EntityFactory;