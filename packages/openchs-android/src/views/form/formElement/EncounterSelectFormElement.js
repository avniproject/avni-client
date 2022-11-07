import React from 'react';
import AbstractFormElement from "./AbstractFormElement";
import EncounterService from "../../../service/EncounterService";
import {Concept} from "openchs-models";
import General from "../../../utility/General";
import {RadioLabelValue} from "../../primitives/RadioGroup";


class EncounterSelectFormElement extends AbstractFormElement {

    constructor(props, context) {
        super(props, context);
        this.encounterService = context.getService(EncounterService);
    }

    get encounterTypeUUID() {
        return this.props.element.concept.recordValueByKey(Concept.keys.encounterTypeUUID);
    }

    get encounterScope() {
        return this.props.element.concept.recordValueByKey(Concept.keys.encounterScope);
    }

    get encounterIdentifier() {
        return this.props.element.concept.recordValueByKey(Concept.keys.encounterIdentifier);
    }

    UNSAFE_componentWillMount() {
        super.UNSAFE_componentWillMount();
    }

    getEncounterOptions() {
        if (this.encounterScope === Concept.encounterScopes.withinSubject) {
            return this.encounterService.getAllBySubjectUUIDAndTypeUUID(this.props.subjectUUID, this.encounterTypeUUID)
        }
        return []
    }

    getValueLabelPairs() {
        return this.getEncounterOptions().map((encounter) =>
            new RadioLabelValue(encounter.getEncounterLabel(this.encounterIdentifier), encounter.uuid, false));
    }

    toggleFormElementAnswerSelection(encounterUUID) {
        this.dispatchAction(this.props.actionName, {
            formElement: this.props.element,
            answerUUID: encounterUUID,
        });
    }

}

export default EncounterSelectFormElement
