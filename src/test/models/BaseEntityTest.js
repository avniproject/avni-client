import {expect} from 'chai';
import _ from "lodash";
import BaseEntity from '../../js/models/BaseEntity';

describe('BaseEntityTest', () => {
    it('collectionHasEntity', () => {
        expect(BaseEntity.collectionHasEntity([{uuid: 'abc'}], {uuid: 'abc'})).to.equal(true);
        expect(BaseEntity.collectionHasEntity([{uuid: 'abc'}], {uuid: 'efg'})).to.equal(false);
    });
});