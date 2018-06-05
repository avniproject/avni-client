import IndividualService from "../../service/IndividualService";
import EntityService from "../../service/EntityService";
import IndividualRelation from "../../../../openchs-models/src/IndividualRelation";
import IndividualRelative from "../../../../openchs-models/src/IndividualRelative";
import IndividualRelativeService from "../../service/IndividualRelativeService";
import _ from "lodash";


export class IndividualAddRelativeActions {
    static getInitialState(context) {
        const relations = context.get(EntityService).getAll(IndividualRelation.schema.name);
        return {relations: relations, individualRelative : IndividualRelative.createEmptyInstance(), validationResults: []};
    }

    static clone(state){
        return {relations: state.relations, individualRelative: state.individualRelative.cloneForEdit()}
    }

    static onLoad(state, action, context) {
        const individual = context.get(IndividualService).findByUUID(action.individual.uuid);
        const newState = IndividualAddRelativeActions.clone(state);
        newState.individualRelative.individual = individual;
        return newState;
    }

    static selectRelative(state, action) {
        const newState = IndividualAddRelativeActions.clone(state);
        newState.individualRelative.relative = action.value;
        IndividualAddRelativeActions.validate(newState);
        return newState;
    }


    static selectRelation(state, action) {
        const newState = IndividualAddRelativeActions.clone(state);
        newState.individualRelative.relation = action.value;
        IndividualAddRelativeActions.validate(newState);
        return newState;
    }

    static validate(state){
        const validationResults = state.individualRelative.validate();
        state.validationResults = validationResults;
        _.remove(state.validationResults, (validationResult) => validationResult.success === true);

    }

    static onSave(state, action, context) {
        const newState = IndividualAddRelativeActions.clone(state);
        IndividualAddRelativeActions.validate(newState);
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