import {LocationMapping, AddressLevel} from "openchs-models";
import General from "../../src/utility/General";
import _ from 'lodash';

class TestAddressLevelFactory {
  static createWithDefaults({parent, level, name}) {
    const addressLevel = new AddressLevel();
    addressLevel.uuid = General.randomUUID();
    addressLevel.name = _.defaultTo(name, addressLevel.uuid);
    addressLevel.type = level+'_level';
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
