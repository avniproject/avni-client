import _ from "lodash";
import General from "./utility/General";
import ResourceUtil from "./utility/ResourceUtil";
import Checklist from './Checklist';
import ChecklistItemStatus from "./ChecklistItemStatus";
import ObservationsHolder from "./ObservationsHolder";
import ChecklistItemDetail from "./ChecklistItemDetail";
import moment from 'moment';

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

    static create({uuid = General.randomUUID(), observations = [], checklist, detail}) {
        return Object.assign(new ChecklistItem(), {uuid, observations, checklist, detail});
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

    get completed() {
        return !_.isNil(this.completionDate);
    }

    get firstState() {
        return this.detail.stateConfig.find(status => status.displayOrder === 1);
    }

    get baseDate() {
        if (this.detail.isDependent) {
            return this.checklist.items
                .find(item => item.detail.uuid === this.detail.dependentOn.uuid).completionDate;
        }
        return this.checklist.baseDate;
    }

    get applicableState() {
        const baseDate = this.baseDate;
        if (this.completed) {
            return ChecklistItemStatus.completed;
        }
        let nonCompletedState = this.detail.stateConfig.find(status => status.isApplicable(baseDate));
        if (!_.isNil(nonCompletedState)) {
            return nonCompletedState;
        }

        if (this.detail.voided || _.isNil(baseDate) || this.firstState.hasNotStarted(baseDate)) {
            return null;
        }

        return ChecklistItemStatus.na(moment().diff(baseDate, 'years'));
    }

    get editable() {
        return !this.detail.voided;
    }

    get applicableStateName() {
        return this.applicableState.state;
    }

    setCompletionDate(date = new Date()) {
        this.completionDate = date;
    }

    get statusDate() {
        return this.completed ? this.completionDate : this.applicableState.fromDate(this.baseDate);
    }

    print() {
        return `ChecklistItem{uuid=${this.uuid}}`;
    }
}

export default ChecklistItem;