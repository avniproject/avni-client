import EntityService from "../../service/EntityService";
import {AddressLevel} from 'openchs-models';
import _ from 'lodash';
import FamilyService from "../../service/FamilyService";

class FamilyFolderActions {
    static getInitialState() {
        return {familiesSummary: {}, familiesList: {data: []}};
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
        allAddressLevels.map((addressLevel) => {
            const address = nameAndID(addressLevel);
            let existingResultForAddress = {
                address: address,
                familiesSummary: {
                    all: {count: 0, abnormal: false},
                    withHighRiskMember: {count: 0, abnormal: true},
                    mother: {count: 0, abnormal: false},
                    child: {count: 0, abnormal: false}
                },
                ...results[addressLevel.uuid],
            };
            existingResultForAddress.familiesSummary.all.count += _.get(allFamilies, addressLevel.uuid, []).length;
            results[addressLevel.uuid] = existingResultForAddress;
        });
        return {...state, familiesSummary: results};
    }

    static onListLoad(state, action, context) {
        const familyService = context.get(FamilyService);
        const methodMap = new Map([
            ["all", familyService.allFamiliesIn],
            // ["withHighRiskMember", familyService.allOverdueVisitsIn],
            // ["mother", familyService.allCompletedVisitsIn],
            // ["child", familyService.allHighRiskPatients]
        ]);
        const allFamilies = methodMap.get(action.listType)(action.address, new Date(), new Date())
            .map(({uuid}) => familyService.findByUUID(uuid));
        const families = [...state.familiesList.data,
            ...allFamilies];
        return {
            ...state,
            familiesList: {
                data: families,
            }
        };
    }

    static resetList(state, action, context) {
        return {
            ...state,
            familiesList: {
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
