import _ from "lodash";
import FormElementGroup from "../../js/models/application/FormElementGroup";
import Form from "../../js/models/application/Form";

class EntityFactory {
    static createFormElementGroup(name, displayOrder, form) {
        const formElementGroup = new FormElementGroup();
        formElementGroup.name = name;
        formElementGroup.displayOrder = displayOrder;
        formElementGroup.formElements = [];
        form.addFormElementGroup(formElementGroup);
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