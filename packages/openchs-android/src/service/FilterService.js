import BaseService from "./BaseService";
import Service from "../framework/bean/Service";
import {SingleSelectFilter} from 'openchs-models';
import _ from 'lodash';
import ProgramConfigService from "./ProgramConfigService";
import IndividualService from "./IndividualService";
import {  MultiSelectFilter  } from 'openchs-models';
import ProgramService from "./program/ProgramService";
import FormMappingService from "./FormMappingService";

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

    getAllFilters() {
        return [this.atRisk(), this.visitType()];
    }
}

export default FilterService;
