import Realm from "realm";
import {EntityMetaData, Schema, SyncError} from "avni-models";
import SyncService from "../service/SyncService";
import BeanRegistry from "../framework/bean/BeanRegistry";
import General from "../utility/General";

const Sync = (db) => {
    let beans = BeanRegistry.init(db, this);
    let syncService = beans.get(SyncService);
    console.log("Sync", "Sync starting");
    return syncService.sync(EntityMetaData.model(), (progress) => {
            console.log("Sync", progress);
            General.logInfo("Sync", progress);
        },
        (message) => {
        }, null, Date.now()).catch((e) => {
        General.logError("Sync", `Sync failed ${e}`);
    })
};

export default Sync;