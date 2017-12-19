import EntityService from "../../service/EntityService";
import {AddressLevel, Program, Individual} from "openchs-models";
import _ from 'lodash';
import IndividualService from "../../service/IndividualService";
import EncounterType from "../../../../openchs-models/src/EncounterType";

class MyDashboardActions {
    static getInitialState() {
        return {visits: {}};
    }


    static clone(state) {
        return {};
    }

    static onLoad(state, action, context) {
        const entityService = context.get(EntityService);
        const individualService = context.get(IndividualService);
        const allAddressLevels = entityService.getAll(AddressLevel.schema.name);
        const nameAndID = ({name, uuid}) => ({name, uuid});
        const results = {};
        allAddressLevels.map((addressLevel) => {
            let existingResultForAddress = Object.assign({
                address: nameAndID(addressLevel),
                visits: {
                    scheduled: {count: 0, abnormal: false},
                    overdue: {count: 0, abnormal: false},
                    completed: {count: 0, abnormal: false},
                    highRisk: {count: 0, abnormal: true}
                },
            }, results[addressLevel.uuid]);
            existingResultForAddress.visits.scheduled.count += individualService.allScheduledVisitsCount(addressLevel);
            existingResultForAddress.visits.overdue.count += individualService.allOverdueVisitsCount(addressLevel);
            existingResultForAddress.visits.completed.count += individualService.allCompletedVisitsCount(addressLevel, new Date(), new Date());
            existingResultForAddress.visits.highRisk.count += individualService.allHighRiskPatientCount(addressLevel);
            results[addressLevel.uuid] = existingResultForAddress;
        });

        return {visits: results};
    }
}

const MyDashboardPrefix = "MyD";

const MyDashboardActionNames = {
    ON_LOAD: `${MyDashboardPrefix}.ON_LOAD`,
};

const MyDashboardActionsMap = new Map([
    [MyDashboardActionNames.ON_LOAD, MyDashboardActions.onLoad],
]);

export {
    MyDashboardActions,
    MyDashboardActionsMap,
    MyDashboardActionNames,
    MyDashboardPrefix
};