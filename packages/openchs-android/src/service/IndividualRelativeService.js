import BaseService from "./BaseService";
import Service from "../framework/bean/Service";
import {IndividualRelative, Individual, EntityQueue} from "openchs-models";

@Service("individualRelativeService")
class IndividualRelativeService extends BaseService {
    constructor(db, context) {
        super(db, context);
    }

    getSchema() {
        return IndividualRelative.schema.name;
    }

    getRelatives(individual) {
        const db = this.db;
        return this.db.objects(IndividualRelative.schema.name).filtered(`individual.uuid="${individual.uuid}"`);
    }

    saveOrUpdate(relative) {
        const db = this.db;
        this.db.write(()=> {
            db.create(IndividualRelative.schema.name, relative, true);

            const loadedIndividualRelative = this.findByUUID(relative.uuid, IndividualRelative.schema.name);
            const individual = this.findByUUID(relative.individual.uuid, Individual.schema.name);
            individual.addRelative(loadedIndividualRelative);

            db.create(EntityQueue.schema.name, EntityQueue.create(relative, IndividualRelative.schema.name));
        });
        return relative;
    }
}

export default IndividualRelativeService;