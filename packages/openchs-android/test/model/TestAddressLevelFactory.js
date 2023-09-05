import {LocationMapping, AddressLevel} from "openchs-models";
import General from "../../src/utility/General";

class TestAddressLevelFactory {
  static createWithDefaults({parent, level}) {
    const addressLevel = new AddressLevel();
    addressLevel.uuid = addressLevel.name = General.randomUUID();
    addressLevel.level = level;
    if (!_.isNil(parent)) {
        const locationMapping = new LocationMapping();
        locationMapping.parent = parent;
        locationMapping.child = addressLevel;
        addressLevel.locationMappings = [locationMapping];
    }
    return addressLevel;
  }
}

export default TestAddressLevelFactory;
