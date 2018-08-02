import _ from "lodash";
import General from "./utility/General";
import ResourceUtil from "./utility/ResourceUtil";
import Checklist from './Checklist';
import Form from './application/Form';
import Concept from './Concept';
import ChecklistItemStatus from "./ChecklistItemStatus";
import ObservationsHolder from "./ObservationsHolder";
import ChecklistItemDetail from "./ChecklistItemDetail";

class ChecklistItem {
    static schema = {
        name: 'ChecklistItem',
        primaryKey: 'uuid',
        properties: {
            uuid: 'string',
            detail: 'ChecklistItemDetail',
            completionDate: {type: 'date', optional: true},
            observations: {type: 'list', objectType: 'Observation'},
            checklist: 'Checklist'
        }
    };

    static create() {
        const checklistItem = new ChecklistItem();
        checklistItem.uuid = General.randomUUID();
        checklistItem.observations = [];
        return checklistItem;
    }

    static fromResource(checklistItemResource, entityService) {
        const checklist = entityService.findByKey("uuid", ResourceUtil.getUUIDFor(checklistItemResource, "checklistUUID"), Checklist.schema.name);
        const checklistItemDetail = entityService.findByKey("uuid", ResourceUtil.getUUIDFor(checklistItemResource, "checklistItemDetailUUID"), ChecklistItemDetail.schema.name);
        const checklistItem = General.assignFields(checklistItemResource, new ChecklistItem(), ["uuid"], ['completionDate'], ['observations'], entityService);
        checklistItem.checklist = checklist;
        checklistItem.detail = checklistItemDetail;
        return checklistItem;
    }

    get toResource() {
        const resource = _.pick(this, ["uuid", "name"]);
        resource["completionDate"] = General.isoFormat(this.completionDate);
        resource["checklistUUID"] = this.checklist.uuid;
        resource["checklistItemDetailUUID"] = this.detail.uuid;
        resource["observations"] = [];
        this.observations.forEach((obs) => {
            resource["observations"].push(obs.toResource);
        });
        return resource;
    }

    clone() {
        const checklistItem = new ChecklistItem();
        checklistItem.uuid = this.uuid;
        checklistItem.detail = this.detail;
        checklistItem.completionDate = this.completionDate;
        checklistItem.checklist = this.checklist;
        checklistItem.observations = ObservationsHolder.clone(this.observations);
        return checklistItem;
    }

    validate() {
        return null;
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
        else if (this.isStillDue) return ChecklistItem.detail.status.Upcoming;
        else if (this.expired) return ChecklistItem.detail.status.Expired;
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

    get applicableState() {
        const baseDate = this.checklist.baseDate;
        return this.completed ? ChecklistItemStatus.completed : this.detail.stateConfig.find(status => status.isApplicable(baseDate));
    }

    get applicableStateName() {
        return this.applicableState.state;
    }

    isNotDueOn(date) {
        return General.dateAIsBeforeB(date, this.dueDate);
    }

    isAfterMaxDate(date) {
        return General.dateAIsAfterB(date, this.maxDate);
    }

    setCompletionDate(date = new Date()) {
        this.completionDate = date;
    }

    get maxDate() {
        return this.completed ? this.completionDate : this.applicableState.maxDate(this.checklist.baseDate);
    }
}

export default ChecklistItem;