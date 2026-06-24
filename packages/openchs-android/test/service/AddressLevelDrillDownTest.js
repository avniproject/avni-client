import {assert} from "chai";
import _ from "lodash";
import TestAddressLevelFactory from '../model/TestAddressLevelFactory';
import AddressLevelService from '../../src/service/AddressLevelService';

// #1958 — the drill-down address picker must only offer branches that can actually reach the
// subject's configured lowest level. In a branching hierarchy (two types sharing a level under
// one parent) the old numeric-level filter leaked dead-end siblings (e.g. Taluka Hospital under
// District when the lowest level is Village). These tests characterise the drill-down filter
// across every hierarchy shape so a regression in the common cases is caught alongside the fix.

function node(level, type, parent, name) {
    const al = TestAddressLevelFactory.createWithDefaults({level, name: name || type, type, parent});
    // The factory wires locationMappings; the service reads the denormalised typeUuid/parentUuid.
    al.typeUuid = `${type}-type`;
    al.parentUuid = parent ? parent.uuid : null;
    return al;
}

// A service whose Realm-touching methods are served from an in-memory tree. getChildren backs the
// drill-down; getAllRootParents/getAllAtLevel back highestLevel (roots = nodes with no parent).
function serviceWith(nodes) {
    const service = new AddressLevelService(null, null);
    const childrenByParent = _.groupBy(nodes.filter(n => n.parentUuid), 'parentUuid');
    service.getChildren = (uuid) => (childrenByParent[uuid] || []);
    const roots = nodes.filter(n => !n.parentUuid);
    const rootLevels = _.uniq(roots.map(n => n.level));
    service.getAllRootParents = () => roots;
    service.getAllAtLevel = () => _.orderBy(nodes.filter(n => _.includes(rootLevels, n.level)), 'level', 'desc');
    return service;
}

const types = nodes => nodes.map(n => n.type);

describe('AddressLevelService drill-down filtering (#1958)', () => {
    // State(7) -> District(6) -> { Taluka(5) -> Village(4),  Taluka Hospital(5) [dead end] }
    //        State(7) -> District Hospital(6) [dead end]
    function branchingFixture() {
        const state = node(7, 'State');
        const district = node(6, 'District', state);
        const districtHospital = node(6, 'DistrictHospital', state);
        const taluka = node(5, 'Taluka', district);
        const talukaHospital = node(5, 'TalukaHospital', district);
        const village = node(4, 'Village', taluka);
        const all = [state, district, districtHospital, taluka, talukaHospital, village];
        return {state, district, districtHospital, taluka, talukaHospital, village, all,
            village_t: [village.typeUuid], service: serviceWith(all)};
    }

    it('excludes a dead-end intermediate sibling at drill-down (the bug)', () => {
        const {service, district, village_t} = branchingFixture();
        assert.deepEqual(types(service.getDescendantsOfParent(district.uuid, village_t)), ['Taluka']);
    });

    it('returns the lowest level when its parent is drilled', () => {
        const {service, taluka, village_t} = branchingFixture();
        assert.deepEqual(types(service.getDescendantsOfParent(taluka.uuid, village_t)), ['Village']);
    });

    it('excludes a dead-end sibling at the top level too (already-correct path)', () => {
        const {service, district, districtHospital, village_t} = branchingFixture();
        assert.deepEqual(types(service.filterTheHierarchy([district, districtHospital], village_t)), ['District']);
    });

    it('never skips an intermediate level — drilling District yields Taluka(5), not Village', () => {
        const {service, district, village_t} = branchingFixture();
        const descendants = service.getDescendantsOfParent(district.uuid, village_t);
        assert.isNotEmpty(descendants);
        assert.isTrue(descendants.every(n => n.level === 5), 'only the direct (level 5) children are returned');
        assert.isTrue(descendants.every(n => n.type !== 'Village'), 'a deeper descendant is never pulled up');
    });

    it('linear hierarchy is unchanged at every drill level', () => {
        const state = node(7, 'State');
        const district = node(6, 'District', state);
        const taluka = node(5, 'Taluka', district);
        const village = node(4, 'Village', taluka);
        const service = serviceWith([state, district, taluka, village]);
        const village_t = [village.typeUuid];
        assert.deepEqual(types(service.getDescendantsOfParent(state.uuid, village_t)), ['District']);
        assert.deepEqual(types(service.getDescendantsOfParent(district.uuid, village_t)), ['Taluka']);
        assert.deepEqual(types(service.getDescendantsOfParent(taluka.uuid, village_t)), ['Village']);
    });

    it('keeps multiple lowest-level types at the same level', () => {
        const state = node(7, 'State');
        const district = node(6, 'District', state);
        const taluka = node(5, 'Taluka', district);
        const village = node(4, 'Village', taluka);
        const phc = node(4, 'PHC', taluka);
        const service = serviceWith([state, district, taluka, village, phc]);
        const lowest = [village.typeUuid, phc.typeUuid];
        assert.sameMembers(types(service.getDescendantsOfParent(taluka.uuid, lowest)), ['Village', 'PHC']);
    });

    it('keeps branches reaching lowest-level types declared at different levels', () => {
        // District branch reaches Village(4); Region branch ends at Block(5) — both valid lowest types.
        const state = node(7, 'State');
        const district = node(6, 'District', state);
        const taluka = node(5, 'Taluka', district);
        const village = node(4, 'Village', taluka);
        const region = node(6, 'Region', state);
        const block = node(5, 'Block', region);
        const service = serviceWith([state, district, taluka, village, region, block]);
        const lowest = [village.typeUuid, block.typeUuid];
        assert.sameMembers(types(service.filterTheHierarchy([district, region], lowest)), ['District', 'Region']);
        assert.deepEqual(types(service.getDescendantsOfParent(region.uuid, lowest)), ['Block']);
        assert.deepEqual(types(service.getDescendantsOfParent(district.uuid, lowest)), ['Taluka']);
    });

    it('hides an intermediate whose lowest-level descendant is not present locally (no completable path lost)', () => {
        // Catchment truncation: a Taluka is on device but its Villages are not synced.
        const state = node(7, 'State');
        const district = node(6, 'District', state);
        const taluka = node(5, 'Taluka', district);
        const service = serviceWith([state, district, taluka]);
        const villageType = ['Village-type'];
        assert.isEmpty(service.getDescendantsOfParent(district.uuid, villageType));
        // The hidden Taluka was never a completable registration target anyway.
        assert.isFalse(service.isOnLowestLevel([taluka], villageType));
    });

    it('edit reconstruction still rebuilds the full real ancestor chain in a branching hierarchy', () => {
        const {service, state, district, taluka, village, all, village_t} = branchingFixture();
        service.maxLevels = () => [7];
        const byUuid = _.keyBy(all, 'uuid');
        service.getParent = (uuid) => [byUuid[uuid]];

        const ancestors = service.getParentsOfLeaf(village, undefined);
        assert.deepEqual(ancestors.map(n => n.uuid), [state.uuid, district.uuid, taluka.uuid]);
        // Each reconstruction step still surfaces the saved descendant as a selectable option.
        assert.isTrue(service.getDescendantsOfParent(district.uuid, village_t).some(n => n.uuid === taluka.uuid));
        assert.isTrue(service.getDescendantsOfParent(taluka.uuid, village_t).some(n => n.uuid === village.uuid));
    });

    // The Location form-element fix: with no Highest Location Level configured the picker uses
    // highestLevel(minLevelTypeUUIDs). When the catchment's top is District and the State ancestor
    // isn't synced, the District Hospitals (5.5) are sibling roots that must still be surfaced.
    it('highestLevel surfaces fractional-level sibling roots when the configured highest type is absent', () => {
        const district = node(6, 'District');
        const dh1 = node(5.5, 'DistrictHospital', null, 'Victoria Hospital');
        const dh2 = node(5.5, 'DistrictHospital', null, 'Bowring hospital');
        const taluka = node(5, 'Taluka', district);
        const village = node(4, 'Village', taluka);
        const service = serviceWith([district, dh1, dh2, taluka, village]);
        const dhType = [dh1.typeUuid];

        const top = service.highestLevel(dhType);
        assert.sameMembers(top.map(n => n.uuid), [dh1.uuid, dh2.uuid]);
        assert.isTrue(top.every(n => n.type === 'DistrictHospital'));

        // Contrast: seeding from a District (the old maxTypeUUID() else-branch) can never reach a DH.
        assert.isEmpty(service.getDescendantsOfParent(district.uuid, dhType));
    });
});
