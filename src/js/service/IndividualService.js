import BaseService from "./BaseService.js";
import Service from "../framework/bean/Service";
import Individual from "../models/Individual";
import _ from 'lodash';
import General from "../utility/General";
import EntityQueue from "../models/EntityQueue";

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
                criteria.getMaxDateOfBirth()).slice(0, 100);
    }

    register(individual) {
        const db = this.db;
        individual.uuid = General.randomUUID();
        this.db.write(() => {
            db.create(Individual.schema.name, individual);
            db.create(EntityQueue.schema.name, EntityQueue.create(individual, Individual.schema.name));
        });
    }
}

export default IndividualService;