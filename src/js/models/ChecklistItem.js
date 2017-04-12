import _ from "lodash";
import General from "../utility/General";
import ResourceUtil from "../utility/ResourceUtil";
import Checklist from './Checklist';
import moment from "moment";

class ChecklistItem {
    static schema = {
        name: 'ChecklistItem',
        primaryKey: 'uuid',
        properties: {
            uuid: 'string',
            concept: 'Concept',
            dueDate: 'date',
            maxDate: {type: 'date', optional: true},
            completionDate: {type: 'date', optional: true},
            checklist: 'Checklist'
        }
    };

    static create() {
        const checklistItem = new ChecklistItem();
        checklistItem.uuid = General.randomUUID();
        return checklistItem;
    }

    static fromResource(checklistItemResource, entityService) {
        const checklist = entityService.findByKey("uuid", ResourceUtil.getUUIDFor(checklistItemResource, "checklistUUID"), Checklist.schema.name);
        const checklistItem = General.assignFields(checklistItemResource, new ChecklistItem(), ["uuid", "name"], ['dueDate', 'maxDate', 'completionDate']);
        checklistItem.checklist = checklist;
        return checklistItem;
    }

    get toResource() {
        const resource = _.pick(this, ["uuid", "name"]);
        resource["programEnrolmentUUID"] = this.programEnrolment.uuid;
        return resource;
    }

    clone() {
        const checklistItem = new ChecklistItem();
        checklistItem.uuid = this.uuid;
        checklistItem.concept = this.concept;
        checklistItem.dueDate = this.dueDate;
        checklistItem.maxDate = this.maxDate;
        checklistItem.completionDate = this.completionDate;
        return checklistItem;
    }

    displayTitle(I18n) {
        return `${I18n.t(this.concept.name)}, Due date: ${moment(item.dueDate).format('DD-MM-YYYY')}, Max date: ${moment(item.maxDate).format('DD-MM-YYYY')}`;
    }
}

export default ChecklistItem;