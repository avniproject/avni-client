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

    get _leadingItem() {
        return this.isDependent
            ? this.checklist.items.find(item => item.detail.uuid === this.detail.dependentOn.uuid)
            : null;
    }

    calculateApplicableState(currentDate = moment()) {
        if (this.completed) {
            return {status: ChecklistItemStatus.completed, statusDate: this.completionDate};
        }

        let isLeadingItemExpired = false;
        let statusDate = null;
        const leadingItem = this._leadingItem;

        if (!_.isNil(leadingItem) && this.scheduleOnExpiryOfDependency) {
            const leadingItemState = leadingItem.calculateApplicableState().status;
            if(_.isNil(leadingItemState)) {
                return {status: null, statusDate: null}
            }
            isLeadingItemExpired = leadingItemState.state === "Expired";
        }

        let lastSetDate = null;

        let nonCompletedState = this.detail.stateConfig.find((status, index) => {
            if (!this.isDependent) {
                const minDate = moment(this.checklist.baseDate).add(status.from.value, status.from.key).startOf("day");
                const maxDate = moment(this.checklist.baseDate).add(status.to.value, status.to.key).endOf("day");
                if (currentDate.isBetween(minDate, maxDate, null, '[]')) {
                    statusDate = minDate.toDate();
                    return true;
                }
            } else if (leadingItem.completed) {
                const minDaysFromStartDate = this.detail.minDaysFromStartDate;
                const daysSinceCompleted = moment(leadingItem.completionDate).diff(this.checklist.baseDate, "day");
                const gap = status.to.value - status.from.value;
                let startAfter = Math.max(daysSinceCompleted + this.firstState.from.value, minDaysFromStartDate);
                let minDate, maxDate;

                if (!_.isNil(lastSetDate)) {
                    minDate = moment(lastSetDate);
                    maxDate = moment(lastSetDate).add(gap, "day");
                } else {
                    minDate = moment(this.checklist.baseDate).add(startAfter, "day").startOf("day");
                    maxDate = moment(this.checklist.baseDate).add(startAfter, "day").add(gap, "day").endOf("day");
                }
                lastSetDate = maxDate;

                if(this.detail.stateConfig.length-1 === index)
                    maxDate = moment(this.checklist.baseDate).add(status.to.value, status.to.key);

                if (currentDate.isBetween(minDate, maxDate, null, '[]')) {
                    statusDate = minDate.toDate();
                    return true;
                }
            }
            else if (isLeadingItemExpired) {
                const minDaysFromStartDate = this.detail.minDaysFromStartDate;
                const diff = minDaysFromStartDate - this.firstState.from.value;
                const minDate = moment(this.checklist.baseDate).add(status.from.value, status.from.key).add(diff, "day").startOf("day");
                const maxDate = moment(this.checklist.baseDate).add(status.to.value, status.to.key).add(diff, "day").endOf("day");
                if (currentDate.isBetween(minDate, maxDate, null, '[]')) {
                    statusDate = minDate.toDate();
                    return true;
                }
            }

            return false;
        });

        if (!_.isNil(nonCompletedState)) {
            return {status: nonCompletedState, statusDate: statusDate};
        }

        return {status: null, statusDate: null};
    }

    get isDependent() {
        return this.detail.isDependent;
    }

    get scheduleOnExpiryOfDependency() {
        return this.detail.scheduleOnExpiryOfDependency;
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