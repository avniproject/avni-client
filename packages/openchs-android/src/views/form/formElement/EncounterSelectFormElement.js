import React from 'react';
import AbstractFormElement from "./AbstractFormElement";
import EncounterService from "../../../service/EncounterService";
import {Concept} from "openchs-models";
import {RadioLabelValue} from "../../primitives/RadioGroup";
import ConceptService from "../../../service/ConceptService";
import IndividualService from "../../../service/IndividualService";
import AddressLevelService from "../../../service/AddressLevelService";
import _ from 'lodash';


class EncounterSelectFormElement extends AbstractFormElement {

    constructor(props, context) {
        super(props, context);
        this.encounterService = context.getService(EncounterService);
        this.conceptService = context.getService(ConceptService);
        this.subjectService = context.getService(IndividualService);
        this.addressLevelService = context.getService(AddressLevelService);
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

    getEncounterOptions() {
        if (this.encounterScope === Concept.encounterScopes.withinSubject) {
            return this.encounterService.getAllBySubjectUUIDAndTypeUUID(this.props.subjectUUID, this.encounterTypeUUID).map(_.identity);
        }
        return [];
    }

    getValueLabelPairs() {
        return this.getEncounterOptions().map((encounter) => {
            return new RadioLabelValue(encounter.getEncounterLabel(this.encounterIdentifier,
                { conceptService:this.conceptService, subjectService:this.subjectService,
                    addressLevelService:this.addressLevelService, i18n:this.I18n,
                    encounterService:this.encounterService}), encounter.uuid, false);
        });
    }

    toggleFormElementAnswerSelection(encounterUUID) {
        this.dispatchAction(this.props.actionName, {
            formElement: this.props.element,
            answerUUID: encounterUUID,
        });
    }

}

export default EncounterSelectFormElement
