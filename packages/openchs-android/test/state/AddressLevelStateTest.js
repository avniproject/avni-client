import {assert} from "chai";
import _ from "lodash";
import TestAddressLevelFactory from '../model/TestAddressLevelFactory';
import AddressLevelsState from '../../src/action/common/AddressLevelsState';

it('should sort addressLevels by levelType and within each levelType by name', function () {
  const grandParentAddrLevel1 = TestAddressLevelFactory.createWithDefaults({level: 3, name: 'grandparent1'});
  const grandParentAddrLevel2 = TestAddressLevelFactory.createWithDefaults({level: 3, name: 'grandparent2'});
  const grandParentAddrLevel3 = TestAddressLevelFactory.createWithDefaults({level: 3, name: 'grandparent3'});

  const parentAddrLevel1 = TestAddressLevelFactory.createWithDefaults({level: 2, name: 'parent1', parent: grandParentAddrLevel1});
  const parentAddrLevel2 = TestAddressLevelFactory.createWithDefaults({level: 2, name: 'parent2', parent: grandParentAddrLevel2});
  const parentAddrLevel3 = TestAddressLevelFactory.createWithDefaults({level: 2, name: 'parent3', parent: grandParentAddrLevel3});

  const childAddrLevel1 = TestAddressLevelFactory.createWithDefaults({level: 1, name: 'child1', parent: parentAddrLevel1});
  const childAddrLevel2 = TestAddressLevelFactory.createWithDefaults({level: 1, name: 'child2', parent: parentAddrLevel2});
  const childAddrLevel3 = TestAddressLevelFactory.createWithDefaults({level: 1, name: 'child3', parent: parentAddrLevel3});

  const allLevels = [
    parentAddrLevel1, parentAddrLevel2, parentAddrLevel3,
    grandParentAddrLevel1, grandParentAddrLevel2, grandParentAddrLevel3,
    childAddrLevel1, childAddrLevel2, childAddrLevel3]

  // Shuffle the addressLevels
  let addressLevelsState = new AddressLevelsState(_.shuffle(allLevels));

  assert.equal(addressLevelsState.levels.length, 3);
  addressLevelsState.levels.map(([levelType, levels], idx) => {
    assert.equal(levels.length, 3); //3 groups for each levelType
    assert.equal(levels[0].type, levelType); // group consists of same type of addressLevels
    assert.equal(levels[0].level, addressLevelsState.levels.length-idx); // Groups are in desc order of the level (Parent to child)
    if(idx >0) {
      //Assert that parent uuid matches with expected value
      const parentLevelElement = addressLevelsState.levels[idx-1][1];
      assert.equal(levels[0].locationMappings[0].parent.uuid, parentLevelElement[0].uuid);
    }
  });
});

it ('should treat multiple address level types at the same level as separate', function() {
    const addrLevel1 = TestAddressLevelFactory.createWithDefaults({level: 1, type: 'a', name: 'location1'});
    const addrLevel2 = TestAddressLevelFactory.createWithDefaults({level: 1, type: 'b', name: 'location2'});
    const addrLevel3 = TestAddressLevelFactory.createWithDefaults({level: 1, type: 'c', name: 'location3'});

    const allLevels = [
        addrLevel1, addrLevel2, addrLevel3,
    ]
    // Shuffle the addressLevels
    let addressLevelsState = new AddressLevelsState(_.shuffle(allLevels));
    assert.equal(addressLevelsState.levels.length, 3);
    addressLevelsState.levels.map(([levelType, levels]) => {
        assert.equal(levels.length, 1); // 1 group for each levelType
        assert.equal(levels[0].type, levelType); // group consists of same type of addressLevels
    });

});