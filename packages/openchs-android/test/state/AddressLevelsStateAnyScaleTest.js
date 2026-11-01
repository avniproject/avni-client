import {assert} from "chai";
import _ from "lodash";
import AddressLevelsState from '../../src/action/common/AddressLevelsState';

// #2168: "Any" on Block with ~7,000 villages under 62 blocks (Goonj maha@goonj catchment) froze the picker.
// The work is in AddressLevelsState, which re-scanned every row for every row.
const level = (uuid, name, lvl, type, parent) => ({
    uuid, name, level: lvl, type, typeUuid: type, parentUuid: parent && parent.uuid,
    locationMappings: parent ? [{parent: {uuid: parent.uuid}}] : [],
});

const catchment = (districtCount, blocksPerDistrict, villagesPerBlock) => {
    const districts = _.range(districtCount).map(d => level(`d${d}`, `District ${d}`, 3, 'District'));
    const blocks = _.flatMap(districts, (d, di) => _.range(blocksPerDistrict).map(b => level(`b${di}-${b}`, `Block ${di}-${b}`, 2, 'Block', d)));
    const villages = _.flatMap(blocks, (b) => _.range(villagesPerBlock).map(v => level(`${b.uuid}-v${v}`, `Village ${b.uuid}-${v}`, 1, 'Village', b)));
    return {districts, blocks, villages};
};

const anyOnDistrictThenBlock = ({districts, blocks, villages}) => {
    const afterDistrict = new AddressLevelsState(districts).activateAny('District', blocks);
    return afterDistrict.activateAny('Block', villages);
};

describe('AddressLevelsState "Any" at scale (#2168)', () => {
    it('gives every village under every block, same as a small catchment would', () => {
        const small = catchment(2, 3, 4);
        const state = anyOnDistrictThenBlock(small);
        const levels = new Map(state.levels);
        assert.lengthOf(levels.get('District'), 2);
        assert.lengthOf(levels.get('Block'), 6);
        assert.lengthOf(levels.get('Village'), 24);
        assert.isTrue(state.isAnyActive('District'));
        assert.isTrue(state.isAnyActive('Block'));
        assert.lengthOf(state.lowestEffectiveAddresses, 6); // Any on Block: every block counts, villages stay pickable
    });

    it('builds the Any-on-Block state for ~7,000 villages in well under a second', () => {
        const goonjSized = catchment(6, 11, 108); // 6 districts, 66 blocks, 7,128 villages
        const started = Date.now();
        const state = anyOnDistrictThenBlock(goonjSized);
        const took = Date.now() - started;
        assert.lengthOf(new Map(state.levels).get('Village'), 7128);
        assert.isBelow(took, 1000, `took ${took} ms`);
    });
});
