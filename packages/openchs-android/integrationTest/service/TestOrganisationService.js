import {AddressLevel, Gender, OrganisationConfig, Settings, Groups, MyGroups} from "openchs-models";
import TestAddressLevelFactory from "../../test/model/TestAddressLevelFactory";
import TestGenderFactory from "../../test/model/TestGenderFactory";
import TestSettingsFactory from "../../test/model/user/TestSettingsFactory";
import TestOrganisationConfigFactory from "../../test/model/TestOrganisationConfigFactory";
import TestGroupsFactory from "../../test/model/TestGroupsFactory";
import TestMyGroupsFactory from "../../test/model/TestMyGroupsFactory";

class TestOrganisationService {
    static setupOrganisation(db) {
        const returnData = {};
        returnData.addressLevel = db.create(AddressLevel, TestAddressLevelFactory.createWithDefaults({level: 1, type: "1"}));
        returnData.addressLevel2 = db.create(AddressLevel, TestAddressLevelFactory.createWithDefaults({level: 1, type: "1"}));
        returnData.gender = db.create(Gender, TestGenderFactory.createWithDefaults({name: "Male"}));
        db.create(Settings, TestSettingsFactory.createWithDefaults({}));
        db.create(OrganisationConfig, TestOrganisationConfigFactory.createWithDefaults({}));
        
        // Create a group with all privileges
        const adminGroup = db.create(Groups, TestGroupsFactory.createAdminGroup());
        
        // Associate the current user with the admin group
        db.create(MyGroups, TestMyGroupsFactory.createForGroup(adminGroup.uuid, adminGroup.groupName));
        
        return returnData;
    }
}

export default TestOrganisationService;
