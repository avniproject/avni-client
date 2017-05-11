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
        resource["dueDate"] = General.isoFormat(this.dueDate);
        resource["maxDate"] = General.isoFormat(this.maxDate);
        resource["completionDate"] = General.isoFormat(this.completionDate);
        resource["checklistUUID"] = this.checklist.uuid;
        resource["conceptUUID"] = this.concept.uuid;
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

    getStatusMessage(I18n) {
        if (this.completed) {
            return I18n.t('completed', {completedOn: General.formatDate(this.completionDate)});
        } else if (this.isStillDue) {
            return I18n.t('dueOn', {dueOn: General.formatDate(this.dueDate)});
        } else if (this.expired) {
            return I18n.t('expired');
        } else {
            return I18n.t('missedDueDate', {dueOn: General.formatDate(this.dueDate)});
        }
    }

    isNotDueOn(date) {
        return General.dateAIsBeforeB(date, this.dueDate);
    }

    isAfterMaxDate(date) {
        return General.dateAIsAfterB(date, this.maxDate);
    }
}

export default ChecklistItem;