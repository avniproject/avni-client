import {assert} from "chai";
import _ from "lodash";
import TestAddressLevelFactory from '../model/TestAddressLevelFactory';
import AddressLevelService from '../../src/service/AddressLevelService';

// #1951 — in edit mode the saved hierarchy must be reconstructed from the lowest saved level
// up to the root. The reconstruction (getParentsOfLeaf) must not be confused by an unrelated
// location type that happens to share the leaf's numeric level (e.g. State(4) -> District(3)
// -> Community(2) -> School(1), with a separate parentless "Knowledge" type also at level 1).
describe('AddressLevelService hierarchy reconstruction (#1951)', () => {
    function chainService() {
        const state = TestAddressLevelFactory.createWithDefaults({level: 4, name: 'state', type: 'State'});
        const district = TestAddressLevelFactory.createWithDefaults({level: 3, name: 'district', type: 'District', parent: state});
        const community = TestAddressLevelFactory.createWithDefaults({level: 2, name: 'community', type: 'Community', parent: district});
        const school = TestAddressLevelFactory.createWithDefaults({level: 1, name: 'school', type: 'School', parent: community});

        // The factory wires locationMappings but not the denormalised parentUuid the walk reads,
        // nor typeUuid (which the second getParentsOfLeaf guard compares against maxLevelTypeUUID).
        state.typeUuid = 'State-type';
        district.typeUuid = 'District-type';
        community.typeUuid = 'Community-type';
        school.typeUuid = 'School-type';
        district.parentUuid = state.uuid;
        community.parentUuid = district.uuid;
        school.parentUuid = community.uuid;

        const byUuid = _.keyBy([state, district, community, school], 'uuid');
        const service = new AddressLevelService(null, null);
        // Stub the only Realm-touching method getParentsOfLeaf uses.
        service.getParent = (uuid) => [byUuid[uuid]];
        // Simulate the misconfig: a parentless "Knowledge" type sits at the same level (1) as
        // School, so the old level-based isRoot saw level 1 as a root level.
        service.maxLevels = () => [4, 1];
        return {service, state, district, community, school};
    }

    it('reconstructs the full ancestor chain when another type shares the leaf level', () => {
        const {service, state, district, community, school} = chainService();
        const ancestors = service.getParentsOfLeaf(school, undefined);
        assert.deepEqual(ancestors.map(a => a.name), ['state', 'district', 'community']);
        assert.deepEqual(ancestors.map(a => a.uuid), [state.uuid, district.uuid, community.uuid]);
    });

    it('treats a parentless node as root regardless of its numeric level', () => {
        const {service, state, school} = chainService();
        assert.isTrue(service.isRoot(state));    // no locationMappings -> root
        assert.isFalse(service.isRoot(school));  // has a parent mapping -> not a root, despite sharing level 1
    });
});
