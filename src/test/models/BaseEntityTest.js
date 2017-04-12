import {expect} from "chai";
import BaseEntity from "../../js/models/BaseEntity";
import EntityFactory from "./EntityFactory";
import General from "../../js/utility/General";
import FormElementGroup from "../../js/models/application/FormElementGroup";

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

    it('addNewChild', () => {
        const form = EntityFactory.createForm('foo');
        const formElementGroup = new FormElementGroup();
        formElementGroup.uuid = General.randomUUID();
        BaseEntity.addNewChild(formElementGroup, form.formElementGroups);
        expect(form.numberOfPages).is.equal(1);
        BaseEntity.addNewChild(formElementGroup, form.formElementGroups);
        expect(form.numberOfPages).is.equal(1);
    });
});