import EntityService from "../../service/EntityService";
import {AddressLevel, Family} from "openchs-models";
import _ from 'lodash';
import FamilyService from "../../service/FamilyService";

class FamilyFolderActions {
    static getInitialState() {
        return {visits: {}, individuals: {data: []}};
    }


    static clone(state) {
        return {};
    }

    static onLoad(state, action, context) {
        const entityService = context.get(EntityService);
        const familyService = context.get(FamilyService);
        const allAddressLevels = entityService.getAll(AddressLevel.schema.name);

        const nameAndID = ({name, uuid}) => ({name, uuid});
        const results = {};
        const allFamilies = _.groupBy(familyService.allFamiliesIn(), 'addressUUID');
        // const individualsWithOverdueVisits = _.groupBy(familyService.allOverdueVisitsIn(), 'addressUUID');
        // const individualsWithCompletedVisits = _.groupBy(familyService.allCompletedVisitsIn(), 'addressUUID');
        // const highRiskPatients = _.groupBy(familyService.allHighRiskPatients(), 'addressUUID');
        allAddressLevels.map((addressLevel) => {
            const address = nameAndID(addressLevel);
            let existingResultForAddress = {
                address: address,
                visits: {
                    all: {count: 0, abnormal: false},
                    withHighRiskMember: {count: 0, abnormal: true},
                    mother: {count: 0, abnormal: false},
                    child: {count: 0, abnormal: false}
                },
                ...results[addressLevel.uuid],
            };
            existingResultForAddress.visits.all.count += _.get(allFamilies, addressLevel.uuid, []).length;
            // existingResultForAddress.visits.overdue.count += _.get(individualsWithOverdueVisits, addressLevel.uuid, []).length;
            // existingResultForAddress.visits.completedVisits.count += _.get(individualsWithCompletedVisits, addressLevel.uuid, []).length;
            // existingResultForAddress.visits.highRisk.count += _.get(highRiskPatients, addressLevel.uuid, []).length;
            results[addressLevel.uuid] = existingResultForAddress;
        });
        return {...state, visits: results};
    }

    static onListLoad(state, action, context) {
        const individualService = context.get(FamilyService);
        const methodMap = new Map([
            ["scheduled", individualService.allScheduledVisitsIn],
            ["overdue", individualService.allOverdueVisitsIn],
            ["completedVisits", individualService.allCompletedVisitsIn],
            ["highRisk", individualService.allHighRiskPatients]
        ]);
        const allIndividuals = methodMap.get(action.listType)(action.address, new Date(), new Date())
            .map(({uuid}) => individualService.findByUUID(uuid));
        const individuals = [...state.individuals.data,
            ...allIndividuals];
        return {
            ...state,
            individuals: {
                data: individuals,
            }
        };
    }

    static resetList(state, action, context) {
        return {
            ...state,
            individuals: {
                data: [],
            }
        }
    }
}

const FamilyFolderPrefix = "FF";

const FamilyFolderActionNames = {
    ON_LOAD: `${FamilyFolderPrefix}.ON_LOAD`,
    ON_LIST_LOAD: `${FamilyFolderPrefix}.ON_LIST_LOAD`,
    RESET_LIST: `${FamilyFolderPrefix}.RESET_LIST`
};

const FamilyFolderActionsMap = new Map([
    [FamilyFolderActionNames.ON_LOAD, FamilyFolderActions.onLoad],
    [FamilyFolderActionNames.ON_LIST_LOAD, FamilyFolderActions.onListLoad],
    [FamilyFolderActionNames.RESET_LIST, FamilyFolderActions.resetList],
]);

export {
    FamilyFolderActions,
    FamilyFolderActionsMap,
    FamilyFolderActionNames,
    FamilyFolderPrefix
};