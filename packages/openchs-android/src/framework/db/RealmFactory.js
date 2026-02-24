import Realm from "realm";
import {EntityMappingConfig, RealmProxy} from "openchs-models";
import EncryptionService from "../../service/EncryptionService";
import _ from "lodash";
import General from "../../utility/General";
import SqliteFactory from "./SqliteFactory";

// Set to true to use the new SQLite backend instead of Realm
const USE_SQLITE = true;

class RealmFactory {
    static async createRealm() {
        if (USE_SQLITE) {
            General.logDebug('RealmFactory', '----------------------------- Loading SQLite db');
            return SqliteFactory.createSqliteProxy();
        }

        const entityMappingConfig = EntityMappingConfig.getInstance();
        const realmConfig = entityMappingConfig.getRealmConfig();

        const encryptionKey = await EncryptionService.getEncryptionKey();
        if(!_.isNil(encryptionKey)) realmConfig.encryptionKey = encryptionKey
        else delete realmConfig.encryptionKey;

        return new RealmProxy(new Realm(realmConfig), entityMappingConfig);
    }

    static createRealmWithoutProxy() {
        General.logDebug('RealmFactory','----------------------------- Loading PLAIN db');
        const entityMappingConfig = EntityMappingConfig.getInstance();
        const realmConfig = entityMappingConfig.getRealmConfig();
        return new Realm(realmConfig);
    }
}

export default RealmFactory;
