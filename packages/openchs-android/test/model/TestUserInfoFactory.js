import {UserInfo} from 'openchs-models';
import General from "../../src/utility/General";

class TestUserInfoFactory {
    static createWithDefaults({uuid = General.randomUUID(), username = "foo", organisationName = "foo", settings = "{}", name = "foo", syncSettings = "{}"}) {
        const userInfo = new UserInfo();
        userInfo.uuid = uuid;
        userInfo.username = username;
        userInfo.organisationName = organisationName;
        userInfo.settings = settings;
        userInfo.name = name;
        userInfo.syncSettings = syncSettings;
        return userInfo;
    }
}

export default TestUserInfoFactory;
