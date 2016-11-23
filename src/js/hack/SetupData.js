import EntitySyncStatus from "../models/EntitySyncStatus";
import _ from "lodash";

class SetupData {
    static setup(entitySyncStatusService, entityMetaDataModel) {
        entityMetaDataModel.forEach(function(entity) {
            if (_.isNil(entitySyncStatusService.get(entity.entityName))) {
                console.log(`Setting up base entity sync status for ${entity.entityName}`);
                entitySyncStatusService.save(EntitySyncStatus.create(entity.entityName, EntitySyncStatus.REALLY_OLD_DATE, SetupData.randomUUID()));
            }
        });
    }

    //http://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript
    static randomUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
            return v.toString(16);
        });
    }
}

export default SetupData;