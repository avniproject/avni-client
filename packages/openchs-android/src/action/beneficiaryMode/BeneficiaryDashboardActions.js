// @flow
import {Form, ValidationResult} from 'openchs-models';
import {Action} from "../util";
import IndividualService from "../../service/IndividualService";

export default class BeneficiaryDashboardActions {
    static getInitialState(context) {
        return {};
    }

    @Action('BDA.onLoad')
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

    @Action('BDA.onEncounterToggle')
    static onEncounterToggle(state, action) {
        const newState = {...state};
        newState.completedEncounters = _.reject(newState.completedEncounters,
                it => it.encounter.uuid === action.encounterInfo.encounter.uuid
        ).concat(action.encounterInfo);
        return newState;
    }

    @Action('BDA.onGeneralEncounterToggle')
    static onGeneralEncounterToggle(state, action) {
        const newState = {...state};
        newState.completedGeneralEncounters = _.reject(newState.completedGeneralEncounters,
                it => it.encounter.uuid === action.encounterInfo.encounter.uuid
        ).concat(action.encounterInfo);
        return newState;
    }
}

const actions = BeneficiaryDashboardActions.Names = {
};

BeneficiaryDashboardActions.Map = new Map([
    [BeneficiaryDashboardActions.onLoad.Id, BeneficiaryDashboardActions.onLoad],
    [BeneficiaryDashboardActions.onEncounterToggle.Id, BeneficiaryDashboardActions.onEncounterToggle],
    [BeneficiaryDashboardActions.onGeneralEncounterToggle.Id, BeneficiaryDashboardActions.onGeneralEncounterToggle],
]);
