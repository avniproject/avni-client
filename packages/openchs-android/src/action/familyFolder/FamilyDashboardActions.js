import EntityService from "../../service/EntityService";
import {Family} from 'avni-models';
import _ from 'lodash';

class FamilyDashboardActions {

    static cloneEntity(entity) {
        if (!_.isNil(entity))
            return entity.cloneForEdit();
    }

    static getInitialState() {
        return {};
    }

    static clone(state) {
        return {
            family: state.family,
        };
    }

    static onLoad(state, action, context) {
        const newState = FamilyDashboardActions.getInitialState();
        const entityService = context.get(EntityService);
        newState.family = entityService.findByUUID(action.familyUUID, Family.schema.name);
        return newState;
    }


    static ACTION_PREFIX = 'FDA';
}

const FamilyDashboardActionsNames = {
    ON_LOAD: 'FDA.ON_LOAD',
    RESET: 'FDA.RESET'
};


const FamilyDashboardActionsMap = new Map([
    [FamilyDashboardActionsNames.ON_LOAD, FamilyDashboardActions.onLoad],
    [FamilyDashboardActionsNames.RESET, FamilyDashboardActions.getInitialState],

]);

export {
    FamilyDashboardActionsNames,
    FamilyDashboardActionsMap,
    FamilyDashboardActions,
};