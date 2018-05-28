import BaseService from "./BaseService.js";
import Service from "../framework/bean/Service";
import {EntityQueue, Family, ObservationsHolder} from "openchs-models";
import _ from 'lodash';

@Service("familyService")
class FamilyService extends BaseService {
    constructor(db, context) {
        super(db, context);
        this.allFamiliesIn = this.allFamiliesIn.bind(this);
    }

    getSchema() {
        return Family.schema.name;
    }

    search(criteria) {
        const filterCriteria = criteria.getFilterCriteria();
        return _.isEmpty(filterCriteria) ? this.db.objects(Family.schema.name).slice(0, 100) :
            this.db.objects(Family.schema.name)
                .filtered(filterCriteria,
                    criteria.getMinDateOfBirth(),
                    criteria.getMaxDateOfBirth()).slice(0, 100);
    }

    register(family) {
        const db = this.db;
        ObservationsHolder.convertObsForSave(family.observations);
        this.db.write(() => {
            db.create(Family.schema.name, family, true);
            db.create(EntityQueue.schema.name, EntityQueue.create(family, Family.schema.name));
        });

    }

    allFamiliesIn() {
        return this.db.objects(Family.schema.name)
            .map((family) => {
                return {uuid: family.uuid, addressUUID: family.lowestAddressLevel.uuid};
            });
    }


}

export default FamilyService;