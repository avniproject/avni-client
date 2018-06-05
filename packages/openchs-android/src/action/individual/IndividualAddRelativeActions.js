import IndividualService from "../../service/IndividualService";
import EntityService from "../../service/EntityService";
import IndividualRelation from "../../../../openchs-models/src/IndividualRelation";
import IndividualRelative from "../../../../openchs-models/src/IndividualRelative";
import IndividualRelativeService from "../../service/IndividualRelativeService";
import {ValidationResult} from "openchs-models";
import _ from "lodash";


export class IndividualAddRelativeActions {
    static getInitialState(context) {
        const relations = context.get(EntityService).getAll(IndividualRelation.schema.name);
        return {relations: relations, individualRelative : IndividualRelative.createEmptyInstance(), validationResults: []};
    }

    static clone(state){
        const newState = {};
        newState.relations = state.relations;
        newState.individualRelative = state.individualRelative.cloneForEdit();
        newState.validationResults = [];
        state.validationResults.forEach((validationResult) => {
            newState.validationResults.push(ValidationResult.clone(validationResult));
        });

        return newState
    }

    static handleValidationResult(state, validationResult) {
        _.remove(state.validationResults, (existingValidationResult) => existingValidationResult.formIdentifier === validationResult.formIdentifier);
        if (!validationResult.success) {
            state.validationResults.push(validationResult);
        }
    }

    static handleValidationResults(state, validationResults) {
        validationResults.forEach((validationResult) => {
            IndividualAddRelativeActions.handleValidationResult(state, validationResult);
        });
    }


    static onLoad(state, action, context) {
        const individual = context.get(IndividualService).findByUUID(action.individual.uuid);
        const newState = IndividualAddRelativeActions.getInitialState(context);
        newState.individualRelative.individual = individual;
        return newState;
    }

    static selectRelative(state, action) {
        const newState = IndividualAddRelativeActions.clone(state);
        newState.individualRelative.relative = action.value;
        IndividualAddRelativeActions.handleValidationResult(newState, newState.individualRelative.validateRelative());
        return newState;
    }


    static selectRelation(state, action) {
        const newState = IndividualAddRelativeActions.clone(state);
        newState.individualRelative.relation = action.value;
        IndividualAddRelativeActions.handleValidationResult(newState, newState.individualRelative.validateRelation());
        return newState;
    }

    static onSave(state, action, context) {
        const newState = IndividualAddRelativeActions.clone(state);
        const validationResults = newState.individualRelative.validate();
        IndividualAddRelativeActions.handleValidationResults(newState, validationResults);
        if(_.isEmpty(newState.validationResults)){
            context.get(IndividualRelativeService).saveOrUpdate(newState.individualRelative);
            action.cb();
        }
        return newState;
    }
}

const actions = {
    ON_LOAD: "ADD_RELATIVE_ON_LOAD",
    INDIVIDUAL_ADD_RELATIVE_SELECT_INDIVIDUAL: "INDIVIDUAL_ADD_RELATIVE_SELECT_INDIVIDUAL",
    INDIVIDUAL_ADD_RELATIVE_SELECT_RELATION: "INDIVIDUAL_ADD_RELATIVE_SELECT_RELATION",
    SAVE: 'IAR.SAVE'
};

export default new Map([
    [actions.ON_LOAD, IndividualAddRelativeActions.onLoad],
    [actions.INDIVIDUAL_ADD_RELATIVE_SELECT_INDIVIDUAL, IndividualAddRelativeActions.selectRelative],
    [actions.INDIVIDUAL_ADD_RELATIVE_SELECT_RELATION, IndividualAddRelativeActions.selectRelation],
    [actions.SAVE, IndividualAddRelativeActions.onSave],
]);

export {actions as Actions};