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

    expired(currentDate) {
        return !_.isNil(this.detail.expiresAfter) && currentDate.isSameOrAfter(this.expiryDate);

    }

    get expiryDate() {
        return _.isNil(this.detail.expiresAfter)
            ? null
            : moment(this.checklist.baseDate).add(this.detail.expiresAfter, "day");
    }

    get firstState() {
        return this.detail.stateConfig.find(status => status.displayOrder === 1);
    }

    get _leadingItem() {
        return this.isDependent
            ? this.checklist.items.find(item => item.detail.uuid === this.detail.dependentOn.uuid)
            : null;
    }

    get conceptName() {
        return this.detail.concept.name;
    }

    calculateApplicableState(currentDate = moment()) {
        if (this.completed) {
            return {status: ChecklistItemStatus.completed, statusDate: this.completionDate};
        }
        //console.log(`0 ${this.conceptName} ${this.checklist.baseDate} ${this.detail.expiresAfter} ${this.expiryDate} ${moment(this.checklist.baseDate).add(this.detail.expiresAfter, "day").toDate()}`);
        if (this.expired(currentDate)) {
            return {status: ChecklistItemStatus.expired, statusDate: this.expiryDate};
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
                const minDate = moment(this.checklist.baseDate)
                    .add(status.start, "day")
                    .startOf("day");
                const maxDate = moment(this.checklist.baseDate)
                    .add(status.end, "day")
                    .endOf("day");
                //console.log(`a ${this.conceptName} ${status.state} ${minDate.toDate()} ${maxDate.toDate()}`);

                if (currentDate.isBetween(minDate, maxDate, null, '[]')) {
                    statusDate = minDate.toDate();
                    return true;
                }
            } else if (leadingItem.completed) {
                let minDate, maxDate;

                minDate = moment.max(
                    moment(this.checklist.baseDate)
                        .add(this.detail.minDaysFromStartDate, "day")
                        .add(status.start, "day"),
                    moment(leadingItem.completionDate)
                        .add(this.detail.minDaysFromDependent, "day")
                        .add(status.start, "day")
                );

                maxDate = moment.max(
                    moment(this.checklist.baseDate)
                        .add(this.detail.minDaysFromStartDate, "day")
                        .add(status.end, "day"),
                    moment(leadingItem.completionDate)
                        .add(this.detail.minDaysFromDependent, "day")
                        .add(status.end, "day")
                );

                //console.log(`b ${this.conceptName} ${status.state} ${minDate.toDate()} ${maxDate.toDate()}`);
                if (currentDate.isBetween(minDate, maxDate, null, '[]')) {
                    statusDate = minDate.toDate();
                    //console.log(`b ${statusDate}`);
                    return true;
                }
            }
            else if (isLeadingItemExpired) {
                const minDate = moment(this.checklist.baseDate)
                    .add(this.detail.minDaysFromStartDate, "day")
                    .add(status.start, "day")
                    .startOf("day");
                const maxDate = moment(this.checklist.baseDate)
                    .add(this.detail.minDaysFromStartDate, "day")
                    .add(status.end, "day")
                    .endOf("day");
                //console.log(`c ${this.conceptName} ${status.state} ${this.detail.minDaysFromStartDate} ${minDate.toDate()} ${maxDate.toDate()}`);

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

    findObservation(conceptName) {
        return _.find(this.observations, (observation) => {
            return observation.concept.name === conceptName
        });
    }

}

export default ChecklistItem;