import Realm from "realm";
import {EntityMappingConfig, RealmProxy} from "openchs-models";

class RealmFactory {
    static createRealm() {
        const entityMappingConfig = EntityMappingConfig.getInstance();
        const realmConfig = entityMappingConfig.getRealmConfig();
        return new RealmProxy(new Realm(realmConfig), entityMappingConfig);
    }
}

export default RealmFactory;
