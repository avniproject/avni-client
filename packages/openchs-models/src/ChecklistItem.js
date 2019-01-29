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

    get leadingItem() {
        return !_.isNil(this.detail.dependentOn)
            ? this.checklist.items.find(item => item.detail.uuid === this.detail.dependentOn.uuid)
            : null;
    }

    get baseDate() {
        if (!_.isNil(this.detail.dependentOn)) {
            let leadingItem = this.checklist.items
                .find(item => item.detail.uuid === this.detail.dependentOn.uuid);
            return _.isNil(leadingItem) ? leadingItem : leadingItem.completionDate;
        }
        return this.checklist.baseDate;
    }

    calculateApplicableState() {
        let baseDate = this.baseDate;
        if (this.completed) {
            return {status: ChecklistItemStatus.completed, statusDate: this.completionDate};
        }

        let isLeadingItemExpired = false;
        let leadingItemState = null;
        let statusDate = null;
        if(!_.isNil(this.leadingItem) && this.detail.scheduleOnExpiryOfDependency) {
            leadingItemState = this.leadingItem.calculateApplicableState().status;
            isLeadingItemExpired = leadingItemState.state === "Expired";
            if(isLeadingItemExpired)
                baseDate = this.checklist.baseDate;
        }

        let nonCompletedState = this.detail.stateConfig.find(status => {
            const minDate = moment(baseDate).add(status.from.value, status.from.key).startOf("day");
            const maxDate = moment(baseDate).add(status.to.value, status.to.key).endOf("day");

            if(isLeadingItemExpired) {
                minDate.add(leadingItemState.from.value, leadingItemState.from.key).startOf("day");
                maxDate.add(leadingItemState.from.value, leadingItemState.from.key).startOf("day");
            }

            const currentDate = moment();
            const isApplicable = currentDate.isBetween(minDate, maxDate);
            if(isApplicable) {
                statusDate = minDate.toDate();
            }
            return isApplicable;
        });

        if (!_.isNil(nonCompletedState)) {
            return {status: nonCompletedState, statusDate: statusDate};
        }

        if (this.detail.voided || _.isNil(baseDate) || this.firstState.hasNotStarted(baseDate)) {
            return {status: null, statusDate: null};
        }

        return {status: ChecklistItemStatus.na(moment().diff(baseDate, 'years')), statusDate: null};
    }

    get editable() {
        return !this.detail.voided;
    }

    setCompletionDate(date = new Date()) {
        this.completionDate = date;
    }
    
    print() {
        return `ChecklistItem{uuid=${this.uuid}}`;
    }
}

export default ChecklistItem;