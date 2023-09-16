import {FormElement} from 'openchs-models';
import General from "../../../src/utility/General";

class TestFormElementFactory {
    static create({uuid = General.randomUUID(), name = General.randomUUID(), displayOrder, concept, formElementGroup, mandatory = true, keyValues = []}) {
        const entity = new FormElement();
        entity.uuid = uuid;
        entity.name = name;
        entity.concept = concept;
        entity.displayOrder = displayOrder;
        entity.mandatory = mandatory;
        entity.keyValues = keyValues;
        formElementGroup.addFormElement(entity);
        return entity;
    }
}

export default TestFormElementFactory;
