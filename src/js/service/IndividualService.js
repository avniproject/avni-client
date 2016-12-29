import BaseService from "./BaseService.js";
import Service from "../framework/bean/Service";
import Individual from "../models/Individual";
import _ from 'lodash';

@Service("individualService")
class IndividualService extends BaseService {
    constructor(db, beanStore) {
        super(db, beanStore);
    }

    getSchema() {
        return Individual.schema.name;
    }

    search(criteria) {
        return _.isEmpty(criteria.getFilterCriteria()) ? this.db.objects(Individual.schema.name).slice(0, 100) :
            this.db.objects(Individual.schema.name)
            .filtered(criteria.getFilterCriteria(),
                criteria.getMinDateOfBirth(),
                criteria.getMaxDateOfBirth()).slice(0, 100)
    }

    register(individual) {
        this.db.write(() => db.create(Individual.schema.name, individual));
    }
}

export default IndividualService;