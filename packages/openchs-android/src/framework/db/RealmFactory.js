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
        return new RealmProxy(new Realm(configWithEncryptionKey), entityMappingConfig);
    }

    static async getRealm(isEncrypted) {
        return isEncrypted ? (await this.createRealmWithEncryptionKey()) : this.createRealm();
    }
}

export default RealmFactory;
