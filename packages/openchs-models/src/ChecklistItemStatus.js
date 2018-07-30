import General from "./utility/General";
import StringKeyNumericValue from "./application/StringKeyNumericValue";
import VisitScheduleConfig from "./VisitScheduleConfig";
import moment from 'moment';

class ChecklistItemStatus {
    static schema = {
        name: 'ChecklistItemStatus',
        primaryKey: 'uuid',
        properties: {
            uuid: 'string',
            state: 'string',
            from: 'StringKeyNumericValue',
            to: 'StringKeyNumericValue',
            color: {type: 'string', default: 'yellow'}
        }
    };

    static fromResource(resource, entityService) {
        const checklistItemStatus = General.assignFields(resource, new ChecklistItemStatus(), ['uuid', 'state', 'color']);
        const [toK, toV] = Object.entries(resource["to"])[0];
        const [fromK, fromV] = Object.entries(resource["from"])[0];
        checklistItemStatus.to = StringKeyNumericValue.fromResource(toK, toV);
        checklistItemStatus.from = StringKeyNumericValue.fromResource(fromK, fromV);
        return checklistItemStatus;
    }

    static create() {
        let checklistItemStatus = new ChecklistItemStatus();
        checklistItemStatus.uuid = General.randomUUID();
        checklistItemStatus.color = 'yellow';
        checklistItemStatus.from = new StringKeyNumericValue();
        checklistItemStatus.to = new StringKeyNumericValue();
        return checklistItemStatus;
    }

    get toResource() {
        return {
            state: this.state,
            from: this.from.toResource,
            to: this.to.toResource,
            color: this.color,
            uuid: this.uuid
        };
    }

    isApplicable(baseDate) {
        const currentDate = moment().startOf("day");
        const minDate = moment(baseDate).add(this.from.value, this.from.key).endOf("day");
        const maxDate = moment(baseDate).add(this.to.value, this.to.key).endOf("day");
        return currentDate.isBetween(minDate, maxDate);
    }

    static VALID_KEYS = ['day', 'week', 'month', 'year']
        .map((k) => [`${k}s`, k])
        .reduce((acc, ks) => acc.concat(ks), []);

    static get completed() {
        const completed = new ChecklistItemStatus();
        completed.color = 'green';
        completed.state = 'Completed';
        return completed;
    }

    static get na() {
        const na = new ChecklistItemStatus();
        na.color = 'grey';
        na.state = 'NA';
        return na;
    }

    maxDate(baseDate) {
        return moment(baseDate).add(this.to.value, this.to.key).toDate();
    }
}

export default ChecklistItemStatus;