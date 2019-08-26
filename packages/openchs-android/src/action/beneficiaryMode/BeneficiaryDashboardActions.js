// @flow
import {Form, ValidationResult} from 'openchs-models';
import {Action} from "../util";

export default class BeneficiaryDashboardActions {
    static getInitialState(context) {
        return {};
    }

    @Action()
    static onLoad(state: Object, action: Object, context: Map) {
        const newState = {...state};
        return newState;
    }
}

const actions = BeneficiaryDashboardActions.Names = {
};

BeneficiaryDashboardActions.Map = new Map([
    [BeneficiaryDashboardActions.onLoad.Id, BeneficiaryDashboardActions.onLoad],
]);
