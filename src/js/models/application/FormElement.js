import ResourceUtil from "../../utility/ResourceUtil";
import FormElementGroup from "./FormElementGroup";
import Concept from "../Concept";
import General from "../../utility/General";
import _ from 'lodash';
import KeyValue from "./KeyValue";
import ValidationResult from "./ValidationResult";

class FormElement {
    static schema = {
        name: 'FormElement',
        primaryKey: 'uuid',
        properties: {
            uuid: 'string',
            name: 'string',
            displayOrder: 'int',
            mandatory: 'bool',
            keyValues: {type: 'list', objectType: 'KeyValue'},
            concept: 'Concept',
            usedInSummary: 'bool',
            generated: 'bool',
            formElementGroup: 'FormElementGroup'
        }
    };

    static fromResource(resource, entityService) {
        const formElementGroup = entityService.findByKey("uuid", ResourceUtil.getUUIDFor(resource, "formElementGroupUUID"), FormElementGroup.schema.name);
        const concept = entityService.findByKey("uuid", ResourceUtil.getUUIDFor(resource, "conceptUUID"), Concept.schema.name);

        const formElement = General.assignFields(resource, new FormElement(), ["uuid", "name", "displayOrder", "mandatory", "usedInSummary", "generated"], []);
        formElement.formElementGroup = formElementGroup;
        formElement.concept = concept;

        //remove orphan keyValues (because KeyValue doesn't have primary key
        entityService.deleteObjects(resource["uuid"], FormElement.schema.name, "keyValues");
        formElement.keyValues = resource["keyValues"];

        return formElement;
    }

    isMultiSelect() {
        const selectRecord = this.recordByKey(FormElement.keys.Select);
        return _.isNil(selectRecord) ? false : selectRecord.value === FormElement.values.Multi;
    }

    recordByKey(key) {
        return _.find(this.keyValues, (keyValue) => keyValue.key === key);
    }

    isSingleSelect() {
        const selectRecord = this.recordByKey(FormElement.keys.Select);
        return _.isNil(selectRecord) ? false : selectRecord.value === FormElement.values.Single;
    }

    get truthDisplayValue() {
        return this.recordByKey(FormElement.keys.TrueValue).value;
    }

    get falseDisplayValue() {
        return this.recordByKey(FormElement.keys.FalseValue).value;
    }

    validate(value) {
        const failure = new ValidationResult(false, this.uuid);
        if (this.mandatory &&
            ((_.isEmpty(_.toString(value))))) {
            failure.messageKey = 'emptyValidationMessage';
        }
        else if (this.concept.datatype === Concept.dataType.Numeric && isNaN(value)) {
            failure.messageKey = 'numericValueValidation';
        }
        else if (this.concept.datatype === Concept.dataType.Numeric && this.concept.violatesRange(value)) {
            failure.messageKey = 'numberOutOfRangeMessage';
        } else {
            return new ValidationResult(true, this.uuid, null);
        }
        return failure;
    }

    static keys = {
        Select: 'Select',
        TrueValue: 'TrueValue',
        FalseValue: 'FalseValue'
    };

    static values = {
        Single: 'Single',
        Multi: 'Multi'
    }
}

export default FormElement;