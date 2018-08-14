import ResourceUtil from "./utility/ResourceUtil";
import General from "./utility/General";
import BaseEntity from "./BaseEntity";
import ChecklistItemDetail from "./ChecklistItemDetail";

class ChecklistDetail extends BaseEntity {
    static schema = {
        name: 'ChecklistDetail',
        primaryKey: 'uuid',
        properties: {
            uuid: 'string',
            name: 'string',
            items: {type: 'list', objectType: 'ChecklistItemDetail'},
            voided: {type: 'bool', default: false}
        }
    };

    static fromResource(checklistResource, entityService) {
        const checklistDetail = General.assignFields(checklistResource, new ChecklistDetail(), ["uuid", "name", "voided"]);
        return checklistDetail;
    }

    static merge = () => BaseEntity.mergeOn('items');

    static associateChild(child, childEntityClass, childResource, entityService) {
        let checklistDetail = entityService.findByKey("uuid", ResourceUtil.getUUIDFor(childResource, "checklistDetailUUID"), ChecklistDetail.schema.name);
        checklistDetail = General.pick(checklistDetail, ["uuid"], ["items"]);

        if (childEntityClass === ChecklistItemDetail)
            BaseEntity.addNewChild(child, checklistDetail.items);
        else
            throw `${childEntityClass.name} not support by ${ChecklistDetail.name}`;
        return checklistDetail;
    }

    print() {
        return `ChecklistDetail{
            uuid=${this.uuid},
            name=${this.name},
            items=${this.items}
        }`;
    }
}

export default ChecklistDetail;