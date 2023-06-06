import Realm from "realm";
import {EntityMappingConfig, RealmProxy} from "openchs-models";
import getKey from "../keychain/Keychain";

class RealmFactory {
    static createRealm() {
        const entityMappingConfig = EntityMappingConfig.getInstance();
        const realmConfig = entityMappingConfig.getRealmConfig();
        return new RealmProxy(new Realm(realmConfig), entityMappingConfig);
    }

    static createRealmWithoutProxy() {
        const entityMappingConfig = EntityMappingConfig.getInstance();
        const realmConfig = entityMappingConfig.getRealmConfig();
        return new Realm(realmConfig);
    }

    static async createRealmWithEncryptionKey() {
        let key = await getKey();
        const entityMappingConfig = EntityMappingConfig.getInstance();
        const configWithEncryptionKey = entityMappingConfig.getRealmConfig();
        configWithEncryptionKey["encryptionKey"] = key
        return new RealmProxy(new Realm(configWithEncryptionKey), entityMappingConfig);
    }
}

export default RealmFactory;
