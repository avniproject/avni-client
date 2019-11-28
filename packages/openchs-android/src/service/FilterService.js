import BaseService from "./BaseService";
import Service from "../framework/bean/Service";
import {SingleSelectFilter} from "avni-models";
import ProgramConfigService from "./ProgramConfigService";
import IndividualService from "./IndividualService";

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

    getAllFilters() {
        //hiding at risk filter for now.
        return [/*this.atRisk()*/];
    }
}

export default FilterService;
