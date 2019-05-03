import ResourceUtil from "../utility/ResourceUtil";
import FormElementGroup from "./FormElementGroup";
import Concept from "../Concept";
import General from "../utility/General";
import _ from "lodash";
import ValidationResult from "./ValidationResult";
import KeyValue from "./KeyValue";
import Format from "./Format"
import Filter from "./Filter";

class FormElement {
    static schema = {
        name: 'FormElement',
        primaryKey: 'uuid',
        properties: {
            uuid: 'string',
            name: 'string',
            displayOrder: 'double',
            mandatory: 'bool',
            keyValues: {type: 'list', objectType: 'KeyValue'},
            concept: 'Concept',
            type: {type: 'string', optional: true},
            formElementGroup: 'FormElementGroup',
            validFormat: {type: 'Format', optional: true},
            voided: {type: 'bool', default: false}
        }
    };

    static fromResource(resource, entityService) {
        const formElementGroup = entityService.findByKey("uuid", ResourceUtil.getUUIDFor(resource, "formElementGroupUUID"), FormElementGroup.schema.name);
        const concept = entityService.findByKey("uuid", ResourceUtil.getUUIDFor(resource, "conceptUUID"), Concept.schema.name);

        const formElement = General.assignFields(resource, new FormElement(), ["uuid", "name", "displayOrder", "mandatory", "type", "voided"], []);
        formElement.formElementGroup = formElementGroup;
        formElement.concept = concept;

        //remove orphan keyValues (because KeyValue doesn't have primary key
        entityService.deleteObjects(resource["uuid"], FormElement.schema.name, "keyValues");
        formElement.keyValues = _.map(resource.keyValues, KeyValue.fromResource);
        formElement.validFormat = Format.fromResource(resource["validFormat"]);
        return formElement;
    }

    getType() {
        return this.concept.datatype === Concept.dataType.Coded ? this.type : this.concept.datatype;
    }

    isMultiSelect() {
        return this.type === Filter.types.MultiSelect;
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

    recordValueByKey(key) {
        return _.invoke(_.find(this.keyValues, it => it.key === key), 'getValue');
    }

    isSingleSelect() {
        return this.type === Filter.types.SingleSelect || _.isNil(this.type);
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
        if (this.mandatory && _.isEmpty(_.toString(value))) {
            failure.messageKey = 'emptyValidationMessage';
        }
        else if (this.concept.datatype === Concept.dataType.Numeric && isNaN(value)) {
            failure.messageKey = 'numericValueValidation';
        }
        else if (this.concept.isBelowLowAbsolute(value)) {
            failure.messageKey = 'numberBelowLowAbsolute';
            failure.extra = {limit: this.concept.lowAbsolute}
        }
        else if (this.concept.isAboveHiAbsolute(value)) {
            failure.messageKey = 'numberAboveHiAbsolute';
            failure.extra = {limit: this.concept.hiAbsolute}
        }
        else if (!_.isEmpty(this.validFormat) && !_.isEmpty(_.toString(value)) && !this.validFormat.valid(value)) {
            failure.messageKey = this.validFormat.descriptionKey;
        }
        else if (this.isMultiSelect() && !_.isEmpty(value)) {
            return this._validateMultiSelect(value);
        }
        else if (this.concept.datatype === Concept.dataType.DateTime
            && General.hoursAndMinutesOfDateAreZero(value)) {
          failure.messageKey = "timeValueValidation";
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

    getAnswerWithConceptName(conceptName) {
        return _.find(this.concept.getAnswers(), (answer) => answer.concept.name === conceptName);
    }

    getRawAnswers() {
        return this.concept.getAnswers();
    }

    static keys = {
        Select: 'Select',
        TrueValue: 'TrueValue',
        FalseValue: 'FalseValue',
        ExcludedAnswers: 'ExcludedAnswers',
        IdSourceUUID: 'IdSourceUUID',
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

    get editable() {
        const editable = this.recordByKey('editable');
        return _.isNil(editable) ? true : editable.getValue();
    }

    get datePickerMode() {
        const datePickerMode = this.recordByKey('datePickerMode');
        return _.isNil(datePickerMode) ? null : datePickerMode.getValue();
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
            formElementGroupUUID: this.formElementGroup.uuid
        };
    }

    _validateMultiSelect(value) {
        const conflict = this.getUniqueAnswerConflict(this._getSelectedAnswers(value));
        if (_.isNil(conflict)) {
            return new ValidationResult(true, this.uuid, null);
        }
        return new ValidationResult(false, this.uuid, 'uniqueAnswerConflict', {answer: conflict.concept.name});
    }

    _getSelectedAnswers(value) {
        return value.isMultipleCoded ? value.getValue() : value;
    }

    getUniqueAnswerConflict(selectedUUIDs) {
        const conceptAnswers = this.getAnswers();
        const selectedConceptAnswers = _.map(selectedUUIDs, (UUID) => _.find(conceptAnswers, (it) => it.concept.uuid === UUID));
        const firstUniqueAnswer = _.find(selectedConceptAnswers, (conceptAnswer) => _.get(conceptAnswer, 'unique'));
        if (selectedUUIDs.length > 1 && !_.isNil(firstUniqueAnswer)) {
            return firstUniqueAnswer;
        }
    }
}

export default FormElement;
