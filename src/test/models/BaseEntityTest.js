import {expect} from "chai";
import BaseEntity from "../../js/models/BaseEntity";

describe('BaseEntityTest', () => {
    it('collectionHasEntity', () => {
        expect(BaseEntity.collectionHasEntity([{uuid: 'abc'}], {uuid: 'abc'})).to.equal(true);
        expect(BaseEntity.collectionHasEntity([{uuid: 'abc'}], {uuid: 'efg'})).to.equal(false);
    });

    it('validateFieldIsNotEmpty', () => {
        const baseEntity = new BaseEntity();
        expect(baseEntity.validateFieldForEmpty(null, '').success).is.equal(false);
        expect(baseEntity.validateFieldForEmpty(new Date(), '').success).is.equal(true);
        expect(baseEntity.validateFieldForEmpty('', '').success).is.equal(false);
    });
});