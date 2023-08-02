import Realm from "realm";
import {EntityMappingConfig, RealmProxy} from "openchs-models";
import getKey from "../keychain/Keychain";

class RealmFactory {
    static createRealm() {
        const entityMappingConfig = EntityMappingConfig.getInstance();
        const realmConfig = entityMappingConfig.getRealmConfig();
        delete realmConfig.encryptionKey;
        console.log("realmConfig:::", realmConfig);
        return new RealmProxy(new Realm(realmConfig), entityMappingConfig);
    }

    static createRealmWithoutProxy() {
        console.log('RealmFactory','----------------------------- Loading PLAIN db');
        const entityMappingConfig = EntityMappingConfig.getInstance();
        const realmConfig = entityMappingConfig.getRealmConfig();
        return new Realm(realmConfig);
    }

    static async createRealmWithEncryptionKey() {
        console.log('RealmFactory','+++++++++++++++++++++++++ Loading ENCRYPTED db');
        let key = await getKey();
        const entityMappingConfig = EntityMappingConfig.getInstance();
        const configWithEncryptionKey = entityMappingConfig.getRealmConfig();
        configWithEncryptionKey["encryptionKey"] = key
        console.log("configWithEncryptionKey:::", configWithEncryptionKey);
        return new RealmProxy(new Realm(configWithEncryptionKey), entityMappingConfig);
    }

    static async getRealm(isEncrypted) {
        console.log("isEncrypted:::", isEncrypted);
        return isEncrypted ? (await this.createRealmWithEncryptionKey()) : this.createRealm();
    }
}

export default RealmFactory;
