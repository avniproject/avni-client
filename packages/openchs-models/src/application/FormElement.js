import ResourceUtil from "../utility/ResourceUtil";
import FormElementGroup from "./FormElementGroup";
import Concept from "../Concept";
import General from "../utility/General";
import _ from "lodash";
import ValidationResult from "./ValidationResult";
import KeyValue from "./KeyValue";
import Format from "./Format"

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
            type: {type: 'string', optional: true},
            generated: 'bool',
            formElementGroup: 'FormElementGroup',
            validFormat: {type: 'Format', optional: true}
        }
    };

    static fromResource(resource, entityService) {
        const formElementGroup = entityService.findByKey("uuid", ResourceUtil.getUUIDFor(resource, "formElementGroupUUID"), FormElementGroup.schema.name);
        const concept = entityService.findByKey("uuid", ResourceUtil.getUUIDFor(resource, "conceptUUID"), Concept.schema.name);

        const formElement = General.assignFields(resource, new FormElement(), ["uuid", "name", "displayOrder", "mandatory", "usedInSummary", "generated", "type"], []);
        formElement.formElementGroup = formElementGroup;
        formElement.concept = concept;

        //remove orphan keyValues (because KeyValue doesn't have primary key
        entityService.deleteObjects(resource["uuid"], FormElement.schema.name, "keyValues");
        formElement.keyValues = [];
        if (!_.isNil(resource["keyValues"])) {
            _.forEach(resource["keyValues"], (keyValue) => {
                formElement.keyValues.push(KeyValue.fromResource(keyValue));
            });
        }
        if (!_.isNil(resource["validFormat"])) {
            console.log(resource["validFormat"]);
            formElement.validFormat = Format.fromResource(resource["validFormat"]);
        }
        return formElement;
    }

    getType() {
        return this.concept.datatype === Concept.dataType.Coded ? this.type : this.concept.datatype;
    }

    isMultiSelect() {
        return this.type === "MultiSelect";
    }

    excludedAnswers() {
        const selectRecord = this.recordByKey(FormElement.keys.ExcludedAnswers);
        return _.isNil(selectRecord) ? [] : selectRecord.getValue();
    }

    set answersToSkip(answersToExclude) {
        this.answersToExclude = answersToExclude;
    }

    recordByKey(key) {
        return _.find(this.keyValues, (keyValue) => keyValue.key === key);
    }

    isSingleSelect() {
        return this.type === "SingleSelect";
    }

    get truthDisplayValue() {
        const trueRecord = this.recordByKey(FormElement.keys.TrueValue);
        return _.isNil(trueRecord) ? 'yes' : trueRecord.getValue();
    }

    get falseDisplayValue() {
        const falseRecord = this.recordByKey(FormElement.keys.FalseValue);
        return _.isNil(falseRecord) ? 'no' : falseRecord.getValue();
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
        } else if (!_.isEmpty(this.validFormat) && !_.isEmpty(_.toString(value)) && !this.validFormat.valid(value)) {
            failure.messageKey = this.validFormat.descriptionKey;
        }
        else {
            return new ValidationResult(true, this.uuid, null);
        }
        return failure;
    }

    getAnswers() {
        const allAnswers = this.concept.getAnswers();
        const excludedAnswers = this.excludedAnswers().map((conceptName) => Object.assign({concept: {name: conceptName}}));
        return _.differenceBy(allAnswers, excludedAnswers.concat(_.isEmpty(this.answersToExclude) ? [] : this.answersToExclude),
            (a) => a.concept.name);
    }

    getRawAnswers() {
        return this.concept.getAnswers();
    }

    static keys = {
        Select: 'Select',
        TrueValue: 'TrueValue',
        FalseValue: 'FalseValue',
        ExcludedAnswers: 'ExcludedAnswers'
    };

    static values = {
        Single: 'Single',
        Multi: 'Multi'
    };

    get translatedFieldValue() {
        return this.name;
    }

    get durationOptions() {
        const durationOptions = this.recordByKey('durationOptions');
        return _.isNil(durationOptions) ? null : durationOptions.getValue();
    }

    matches(elementNameOrUUID) {
        return this.name === elementNameOrUUID || this.uuid === elementNameOrUUID;
    }

    toJSON() {
        return {
            uuid: this.uuid,
            name: this.name,
            displayOrder: this.displayOrder,
            mandatory: this.mandatory,
            keyValues: this.keyValues,
            concept: this.concept,
            usedInSummary: this.usedInSummary,
            generated: this.generated,
            formElementGroupUUID: this.formElementGroup.uuid
        };
    }
}

export default FormElement;
