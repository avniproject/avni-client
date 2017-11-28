import {assert} from "chai";
import BaseEntity from "../src/BaseEntity";
import EntityFactory from "./EntityFactory";
import General from "../src/utility/General";
import FormElementGroup from "../src/application/FormElementGroup";

describe('BaseEntityTest', () => {
    it('collectionHasEntity', () => {
        assert.equal(BaseEntity.collectionHasEntity([{uuid: 'abc'}], {uuid: 'abc'}), true);
        assert.equal(BaseEntity.collectionHasEntity([{uuid: 'abc'}], {uuid: 'efg'}), false);
    });

    it('validateFieldIsNotEmpty', () => {
        const baseEntity = new BaseEntity();
        assert.equal(baseEntity.validateFieldForEmpty(null, '').success, false);
        assert.equal(baseEntity.validateFieldForEmpty(new Date(), '').success, true);
        assert.equal(baseEntity.validateFieldForEmpty('', '').success, false);
    });

    it('addNewChild', () => {
        const form = EntityFactory.createForm('foo');
        const formElementGroup = new FormElementGroup();
        formElementGroup.uuid = General.randomUUID();
        BaseEntity.addNewChild(formElementGroup, form.formElementGroups);
        assert.equal(form.numberOfPages, 1);
        BaseEntity.addNewChild(formElementGroup, form.formElementGroups);
        assert.equal(form.numberOfPages, 1);
    });
});