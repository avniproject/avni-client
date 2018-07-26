import _ from "lodash";
import General from "./utility/General";
import ResourceUtil from "./utility/ResourceUtil";
import Checklist from './Checklist';
import Form from './application/Form';
import Concept from './Concept';
import ChecklistItemStatus from "./ChecklistItemStatus";
import ObservationsHolder from "./ObservationsHolder";

class ChecklistItem {
    static schema = {
        name: 'ChecklistItem',
        primaryKey: 'uuid',
        properties: {
            uuid: 'string',
            concept: 'Concept',
            stateConfig: {type: 'list', objectType: 'ChecklistItemStatus'},
            completionDate: {type: 'date', optional: true},
            form: {type: 'Form', optional: true},
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
        const form = entityService.findByKey("uuid", ResourceUtil.getUUIDFor(checklistItemResource, "formUUID"), Form.schema.name);
        const concept = entityService.findByKey("uuid", ResourceUtil.getUUIDFor(checklistItemResource, "conceptUUID"), Concept.schema.name);

        const checklistItem = General.assignFields(checklistItemResource, new ChecklistItem(), ["uuid", "name"], ['completionDate'], ['observations']);
        checklistItem.stateConfig = _.get(checklistItemResource, "checklistItemStatus", [])
            .map(itemStatus => ChecklistItemStatus.fromResource(itemStatus, entityService));
        checklistItem.checklist = checklist;
        checklistItem.form = form;
        checklistItem.concept = concept;
        return checklistItem;
    }

    get toResource() {
        const resource = _.pick(this, ["uuid", "name"]);
        resource["completionDate"] = General.isoFormat(this.completionDate);
        resource["checklistUUID"] = this.checklist.uuid;
        resource["conceptUUID"] = this.concept.uuid;
        resource["status"] = this.stateConfig.map(sc => sc.toResource);
        resource["formUUID"] = _.get(this.form, 'uuid', null);
        resource["observations"] = [];
        this.observations.forEach((obs) => {
            resource["observations"].push(obs.toResource);
        });
        return resource;
    }

    clone() {
        const checklistItem = new ChecklistItem();
        checklistItem.uuid = this.uuid;
        checklistItem.concept = this.concept;
        checklistItem.completionDate = this.completionDate;
        checklistItem.stateConfig = this.stateConfig;
        checklistItem.form = this.form;
        checklistItem.observations = ObservationsHolder.clone(this.observations);
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