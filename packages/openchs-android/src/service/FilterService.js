import BaseService from "./BaseService";
import Service from "../framework/bean/Service";
import {ProgramEncounter, SingleSelectFilter, FormMapping, Form, EncounterType} from "openchs-models";
import _ from 'lodash';
import ProgramConfigService from "./ProgramConfigService";
import IndividualService from "./IndividualService";
import MultiSelectFilter from "openchs-models/src/application/MultiSelectFilter";
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
                ['No', individualService.notAtRiskFilter(atRiskConcepts)]]));
    }

    visitType() {
        const programService = this.getService(ProgramService);
        const formMappingService = this.getService(FormMappingService);
        const individualService = this.getService(IndividualService);
        const encounterTypes = _.flatten(programService.allPrograms()
            .map((program) => formMappingService.findEncounterTypesForProgram(program)));
        const filterMap = encounterTypes.reduce((acc, et) => acc.set(et.name, individualService
            .filterByEncounterType(et)), new Map());
        return new MultiSelectFilter("Visit Type", filterMap);
    }

    getAllFilters() {
        return [this.atRisk(), this.visitType()];
    }
}

export default FilterService;