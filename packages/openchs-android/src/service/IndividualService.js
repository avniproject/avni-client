import BaseService from "./BaseService.js";
import Service from "../framework/bean/Service";
import {Individual, EntityQueue, Program, ObservationsHolder} from "openchs-models";
import _ from 'lodash';

@Service("individualService")
class IndividualService extends BaseService {
    constructor(db, context) {
        super(db, context);
    }

    getSchema() {
        return Individual.schema.name;
    }

    search(criteria) {
        const filterCriteria = criteria.getFilterCriteria();
        return _.isEmpty(filterCriteria) ? this.db.objects(Individual.schema.name).slice(0, 100) :
            this.db.objects(Individual.schema.name)
            .filtered(filterCriteria,
                criteria.getMinDateOfBirth(),
                criteria.getMaxDateOfBirth()).slice(0, 100);
    }

    register(individual) {
        const db = this.db;
        ObservationsHolder.convertObsForSave(individual.observations);
        this.db.write(() => {
            db.create(Individual.schema.name, individual, true);
            db.create(EntityQueue.schema.name, EntityQueue.create(individual, Individual.schema.name));
        });
    }

    eligiblePrograms(individualUUID) {
        const programs = this.getAll(Program.schema.name);
        const individual = this.findByUUID(individualUUID);
        return individual.eligiblePrograms(programs);
    }


}

export default IndividualService;