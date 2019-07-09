import _ from "lodash";
import EntityFactory from "../EntityFactory";
import {Concept, EncounterType, FormMapping} from '../../src/index';
import General from "../../src/utility/General";

export default class ProgramBuilder {
    constructor(programConfig) {
        this.program = EntityFactory.createProgram({uuid: programConfig.uuid, name: programConfig.name});
        this.concepts = [];
        this.forms = [];
        this.encounterTypes = [];
        this.formMappings = [];
        this._createConcept = this._createConcept.bind(this);
        this._createFormElement = this._createFormElement.bind(this);
        this._createFormElementGroup = this._createFormElementGroup.bind(this);
        this._createEncounterType = this._createEncounterType.bind(this);
    }

    _getConceptFrom(uuid) {
        return this.concepts.find((concept) => concept.uuid === uuid);
    }

    _createConcept(concept) {
        if (this._getConceptFrom(concept.uuid)) return this._getConceptFrom(concept.uuid);
        const createdConcept = EntityFactory.createConcept(concept.name, concept.dataType, concept.uuid);
        if (!_.isNil(createdConcept.answers)) {
            concept.answers.map((cc, idx) => {
                let conceptAnswer;
                const existingAnswerConcept = this._getConceptFrom(cc.uuid);
                if (!_.isNil(existingAnswerConcept)) {
                    conceptAnswer = EntityFactory.createAnswerConcept(existingAnswerConcept, idx + 1);
                    createdConcept.answers.push(conceptAnswer);
                } else if (!_.isNil(cc.name)) {
                    let answerConcept = EntityFactory.createConcept(cc.name, Concept.dataType.NA, cc.uuid);
                    this.concepts.push(answerConcept);
                    conceptAnswer = EntityFactory.createAnswerConcept(answerConcept, idx + 1);
                    createdConcept.answers.push(conceptAnswer);
                }
            });
        }
        this.concepts.push(createdConcept);
        return createdConcept;
    }

    _createFormElement(formElementGroup) {
        return (formElementToCreate) => {
            let concept;
            if (!_.isNil(formElementToCreate.concept)) {
                concept = this._createConcept(formElementToCreate.concept);
            } else {
                concept = this._getConceptFrom(formElementToCreate.conceptUUID);
            }
            const formElement = EntityFactory.createFormElement(formElementToCreate.name, formElementToCreate.mandatory, concept, formElementToCreate.displayOrder, formElementToCreate.type);
            formElement.uuid = formElementToCreate.uuid;
            formElement.formElementGroup = formElementGroup;
            return formElement;
        }
    }

    _createFormElements(formElements, formElementGroup) {
        return formElements.map(this._createFormElement(formElementGroup));
    }

    _createFormElementGroup(form) {
        return (formElementGroupToCreate) => {
            const formElementGroup = EntityFactory.createFormElementGroup(formElementGroupToCreate.name, formElementGroupToCreate.displayOrder, form);
            formElementGroup.uuid = formElementGroupToCreate.uuid;
            formElementGroup.display = formElementGroup.name;
            formElementGroup.formElements = this._createFormElements(formElementGroupToCreate.formElements, formElementGroup);
            return formElementGroup;
        };
    }

    _createFormElementGroups(formElementGroups, form) {
        return formElementGroups.map(this._createFormElementGroup(form));
    }

    _createForm(formToCreate) {
        const form = EntityFactory.createForm(formToCreate.name);
        form.uuid = formToCreate.uuid;
        form.formType = formToCreate.formType;
        form.formElementGroups = this._createFormElementGroups(formToCreate.formElementGroups, form);
        return form;
    }

    _createEncounterType(encounterType) {
        let existingEncounterType = this.encounterTypes.find(et => et.name === encounterType.name);
        return _.isNil(existingEncounterType) ? EncounterType.create(encounterType.name) :
            existingEncounterType;
    }

    _createEncounterTypes(encounterTypes) {
        return encounterTypes.map(this._createEncounterType);
    }

    _createFormMapping(encounterForm, form) {
        const encounterTypes = this._createEncounterTypes(encounterForm.encounterTypes);
        return encounterTypes.map((et) => FormMapping.create(General.randomUUID(), form, this.program.uuid, et.uuid));
    }

    withEncounterForm(encounterForm) {
        let form = this._createForm(encounterForm);
        this.forms.push(form);
        return this;
    }

    withEnrolmentform(enrolmentForm) {
        let form = this._createForm(enrolmentForm);
        this.forms.push(form);
        let formMapping = FormMapping.create(General.randomUUID(), form, this.program.uuid, null);
        this.formMappings.push(formMapping);
        return this;
    }

    withConcepts(concepts) {
        concepts.forEach(this._createConcept);
        return this;
    }

    build() {
        return Object.assign(this.program, {
            forms: this.forms,
            concepts: this.concepts.filter(c => c.name != undefined),
            encounterTypes: this.encounterTypes,
            formMappings: this.formMappings
        });
    }
}
