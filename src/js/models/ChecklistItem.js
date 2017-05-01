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

    static status = {
        Upcoming: 'Upcoming',
        PastDue: 'PastDue',
        Expired: 'Expired',
        Completed: 'Completed'
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

    scheduleDisplay(I18n) {
        return `${I18n.t('due')}: ${moment(this.dueDate).format('DD-MM-YYYY')}, ${I18n.t('expires')}: ${moment(this.maxDate).format('DD-MM-YYYY')}`;
    }

    get isStillDue() {
        return General.dateIsAfterToday(this.dueDate);
    }

    get completed() {
        return !_.isNil(this.completionDate);
    }

    get expired() {
        return General.dateAIsAfterB(new Date(), this.maxDate);
    }

    get status() {
        if (this.completed) return ChecklistItem.status.Completed;
        else if (this.isStillDue) return ChecklistItem.status.Upcoming;
        else if (this.expired) return ChecklistItem.status.Expired;
        return ChecklistItem.status.PastDue;
    }
}

export default ChecklistItem;