import {AddressLevel, Gender, OrganisationConfig, Settings} from "openchs-models";
import TestAddressLevelFactory from "../../test/model/TestAddressLevelFactory";
import TestGenderFactory from "../../test/model/TestGenderFactory";
import TestSettingsFactory from "../../test/model/user/TestSettingsFactory";
import TestOrganisationConfigFactory from "../../test/model/TestOrganisationConfigFactory";

class TestOrganisationService {
    static setupOrganisation(db) {
        const returnData = {};
        returnData.addressLevel = db.create(AddressLevel, TestAddressLevelFactory.createWithDefaults({level: 1}));
        returnData.addressLevel2 = db.create(AddressLevel, TestAddressLevelFactory.createWithDefaults({level: 1}));
        returnData.gender = db.create(Gender, TestGenderFactory.createWithDefaults({name: "Male"}));
        db.create(Settings, TestSettingsFactory.createWithDefaults({}));
        db.create(OrganisationConfig, TestOrganisationConfigFactory.createWithDefaults({}));
        return returnData;
    }
}

export default TestOrganisationService;
