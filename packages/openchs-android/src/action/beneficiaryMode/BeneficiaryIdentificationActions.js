// @flow
import {Form, Observation, PrimitiveValue, ValidationResult} from 'avni-models';
import EntityService from "../../service/EntityService";
import ObservationsHolderActions from "../common/ObservationsHolderActions";
import BeneficiaryIdentificationState from "../../state/BeneficiaryIdentificationState";
import IndividualService from "../../service/IndividualService";
import {Action} from "../util";

export default class BeneficiaryIdentificationActions {
    static getInitialState(context) {
        return new BeneficiaryIdentificationState([], undefined, []);
    }

    @Action('BIA.onLoad')
    static onLoad(state: BeneficiaryIdentificationState, action: Object, context: Map) {
        const newState = new BeneficiaryIdentificationState([], undefined, []);
        const form = context.get(EntityService).findByKey('formType', 'BeneficiaryIdentification', Form.schema.name);
        newState.form = form;
        newState.formElementGroup = form.nonVoidedFormElementGroups()[0];
        return newState;
    }

    @Action('BIA.findIndividual')
    static findIndividual(state: BeneficiaryIdentificationState, action: Object, context: Map) {
        const individualService = context.get(IndividualService);
        const individual = individualService.filterBy(individual => {
            return _.every(state.formElementGroup.getFormElements(), (fm) => {
                const sov = BeneficiaryIdentificationActions._getObservationValue(state, fm.concept);
                const iov = fm.recordByKey('individualprop')
                    ? BeneficiaryIdentificationActions._getIndividualProp(individual, fm)
                    : BeneficiaryIdentificationActions._getIndividualObs(individual, fm);
                return !_.isNil(iov) && !_.isNil(sov) && (JSON.stringify(iov) === JSON.stringify(sov)) && individual.voided === false;
            });
        });
        action.cb(individual);
        return state;
    }

    static _getObservationValue(state, concept) {
        const so = state.observationsHolder.getObservation(concept);
        return so && so.getReadableValue();
    }

    static _getIndividualProp(individual, fm) {
        const val = _.get(individual, fm.recordValueByKey('individualprop'));
        return val && (new PrimitiveValue(val, fm.concept.datatype)).getValue();
    }

    static _getIndividualObs(individual, fm) {
        const val = individual.findObservation(fm.concept.name);
        return val && val.getReadableValue();
    }
}

const actions = BeneficiaryIdentificationActions.Names = {
    TOGGLE_MULTISELECT_ANSWER: "BIA.TOGGLE_MULTISELECT_ANSWER",
    TOGGLE_SINGLESELECT_ANSWER: "BIA.TOGGLE_SINGLESELECT_ANSWER",
    PRIMITIVE_VALUE_CHANGE: "BIA.PRIMITIVE_VALUE_CHANGE",
    PRIMITIVE_VALUE_END_EDITING: "BIA.PRIMITIVE_VALUE_END_EDITING",
    DURATION_CHANGE: "BIA.DURATION_CHANGE",
    DATE_DURATION_CHANGE: "BIA.DATE_DURATION_CHANGE",
};

BeneficiaryIdentificationActions.Map = new Map([
    [BeneficiaryIdentificationActions.onLoad.Id, BeneficiaryIdentificationActions.onLoad],
    [BeneficiaryIdentificationActions.findIndividual.Id, BeneficiaryIdentificationActions.findIndividual],
    [actions.TOGGLE_MULTISELECT_ANSWER, ObservationsHolderActions.toggleMultiSelectAnswer],
    [actions.TOGGLE_SINGLESELECT_ANSWER, ObservationsHolderActions.toggleSingleSelectAnswer],
    [actions.PRIMITIVE_VALUE_CHANGE, ObservationsHolderActions.onPrimitiveObsUpdateValue],
    [actions.PRIMITIVE_VALUE_END_EDITING, ObservationsHolderActions.onPrimitiveObsEndEditing],
    [actions.DURATION_CHANGE, ObservationsHolderActions.onDurationChange],
    [actions.DATE_DURATION_CHANGE, ObservationsHolderActions.onDateDurationChange],
]);
