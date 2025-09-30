// @flow
import {Form, ValidationResult} from 'avni-models';
import {Action} from "../util";
import IndividualService from "../../service/IndividualService";
import _ from "lodash";

export default class BeneficiaryDashboardActions {
    static getInitialState(context) {
        return {};
    }

    static onLoad(state: Object, action: Object, context: Map) {
        const newState = {...state};
        newState.beneficiary = action.beneficiary || context.get(IndividualService).findByUUID(action.beneficiaryUUID);
        newState.enrolment = newState.beneficiary.firstActiveOrRecentEnrolment;
        newState.completedEncounters = _.filter(newState.enrolment && newState.enrolment.nonVoidedEncounters(),
                it => it.encounterDateTime || it.cancelDateTime
        ).map(encounter => ({encounter, expand: false}));
        newState.completedGeneralEncounters = _.filter(newState.beneficiary.nonVoidedEncounters(),
            it => it.encounterDateTime || it.cancelDateTime
        ).map(encounter => ({encounter, expand: false}));
        return newState;
    }

    static onEncounterToggle(state, action) {
        const newState = {...state};
        newState.completedEncounters = _.reject(newState.completedEncounters,
                it => it.encounter.uuid === action.encounterInfo.encounter.uuid
        ).concat(action.encounterInfo);
        return newState;
    }

    static onGeneralEncounterToggle(state, action) {
        const newState = {...state};
        newState.completedGeneralEncounters = _.reject(newState.completedGeneralEncounters,
                it => it.encounter.uuid === action.encounterInfo.encounter.uuid
        ).concat(action.encounterInfo);
        return newState;
    }
}

// Manually assign Action IDs (replacing @Action decorators)
BeneficiaryDashboardActions.onLoad.Id = 'BDA.onLoad';
BeneficiaryDashboardActions.onEncounterToggle.Id = 'BDA.onEncounterToggle';
BeneficiaryDashboardActions.onGeneralEncounterToggle.Id = 'BDA.onGeneralEncounterToggle';

const actions = BeneficiaryDashboardActions.Names = {
};

BeneficiaryDashboardActions.Map = new Map([
    [BeneficiaryDashboardActions.onLoad.Id, BeneficiaryDashboardActions.onLoad],
    [BeneficiaryDashboardActions.onEncounterToggle.Id, BeneficiaryDashboardActions.onEncounterToggle],
    [BeneficiaryDashboardActions.onGeneralEncounterToggle.Id, BeneficiaryDashboardActions.onGeneralEncounterToggle],
]);
