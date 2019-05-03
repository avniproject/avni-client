import BaseService from "./BaseService";
import Service from "../framework/bean/Service";
import {SingleSelectFilter} from 'openchs-models';
import _ from 'lodash';
import ProgramConfigService from "./ProgramConfigService";
import IndividualService from "./IndividualService";
import {  MultiSelectFilter  } from 'openchs-models';
import ProgramService from "./program/ProgramService";
import FormMappingService from "./FormMappingService";
import AddressLevelService from "./AddressLevelService";
import AddressLevelsState from "../action/common/AddressLevelsState";

@Service("FilterService")
class FilterService extends BaseService {
    constructor(db, beanStore) {
        super(db, beanStore);
        this.filters = [];
    }

    atRisk() {
        const programConfigService = this.getService(ProgramConfigService);
        const individualService = this.getService(IndividualService);
        const atRiskConcepts = programConfigService.atRiskConcepts();
        return new SingleSelectFilter("At Risk?",
            new Map([
                ['Yes', individualService.atRiskFilter(atRiskConcepts)],
                ['No', individualService.notAtRiskFilter(atRiskConcepts)]]), new Map());
    }

    visitType() {
        const programService = this.getService(ProgramService);
        const formMappingService = this.getService(FormMappingService);
        const encounterTypes = _.flatten(programService.allPrograms()
            .map((program) => formMappingService.findEncounterTypesForProgram(program)));
        const filterMap = encounterTypes.reduce((acc, et) => acc.set(et.name, ` encounterType.uuid = '${et.uuid}' `), new Map());
        return new MultiSelectFilter("Visit Type", new Map(), filterMap);
    }

    locations() {
        const addressLevelService = this.getService(AddressLevelService);
        const highestAddressLevels = addressLevelService.highestLevel();
        const addLevelState = new AddressLevelsState(highestAddressLevels);
        return addLevelState.levels.map(([levelType, levels], idx) => {
            const sbc = levels.reduce((acc, adr) => acc.set(adr.name, ` address.uuid = '${adr.uuid}' `), new Map());
            return new MultiSelectFilter(levelType, new Map(), sbc)
        })
    }

    getAllFilters() {
        return [ /*...this.locations(),*/ this.atRisk(), this.visitType()];
    }
}

export default FilterService;
