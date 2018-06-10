import BaseService from "./BaseService";
import Service from "../framework/bean/Service";
import {IndividualRelative, Individual, EntityQueue} from "openchs-models";
import IndividualReverseRelation from "../../../openchs-models/src/IndividualReverseRelation";
import _ from 'lodash';
import General from "../utility/General";

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

    getReverseRelation(relation, gender){
        return this.db.objects(IndividualReverseRelation.schema.name).filtered('relationUUID = $0 ' + 'AND genderUUID = $1 ', relation.uuid, gender.uuid)[0];
    }

    saveOrUpdate(relative, saveReverseRelative=true) {
        const db = this.db;
        this.db.write(()=> {
            db.create(IndividualRelative.schema.name, relative, true);

            const loadedIndividualRelative = this.findByUUID(relative.uuid, IndividualRelative.schema.name);
            const individual = this.findByUUID(relative.individual.uuid, Individual.schema.name);
            individual.addRelative(loadedIndividualRelative);
            db.create(EntityQueue.schema.name, EntityQueue.create(relative, IndividualRelative.schema.name));
            General.logDebug('IndividualRelativeService', 'Saved IndividualRelative');
        });

        if(saveReverseRelative === true){
            const individualReverseRelation = this.getReverseRelation(relative.relation,relative.individual.gender);
            if(!_.isNil(individualReverseRelation)){
                General.logDebug('IndividualRelativeService', 'Saving ReverseRelative');
                const reverseRelative = relative.getReverseRelative(individualReverseRelation);
                this.saveOrUpdate(reverseRelative, false);
            }
            else {
                General.logDebug('IndividualRelativeService', 'No reverse relation found');
            }


        }

        return relative;
    }
}

export default IndividualRelativeService;