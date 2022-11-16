import BaseService from "./BaseService";
import Service from "../framework/bean/Service";
import ProgramConfigService from "./ProgramConfigService";
import IndividualService from "./IndividualService";
import SingleSelectFilterModel from "../model/SingleSelectFilterModel";

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
        return new SingleSelectFilterModel("At Risk?",
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
