import General from "./utility/General";
import StringKeyNumericValue from "./application/StringKeyNumericValue";
import VisitScheduleConfig from "./VisitScheduleConfig";
import moment from 'moment';

class ChecklistItemStatus {
    static schema = {
        name: 'ChecklistItemStatus',
        properties: {
            state: 'string',
            from: 'StringKeyNumericValue',
            to: 'StringKeyNumericValue',
            color: {type: 'string', default: 'yellow'},
            displayOrder: 'double'
        }
    };

    static fromResource(resource, entityService) {
        const checklistItemStatus = General.assignFields(resource, new ChecklistItemStatus(), ['state', 'color', 'displayOrder']);
        const [toK, toV] = Object.entries(resource["to"])[0];
        const [fromK, fromV] = Object.entries(resource["from"])[0];
        checklistItemStatus.to = StringKeyNumericValue.fromResource(toK, toV);
        checklistItemStatus.from = StringKeyNumericValue.fromResource(fromK, fromV);
        return checklistItemStatus;
    }

    isApplicable(baseDate) {
        const currentDate = moment();
        const minDate = moment(baseDate).add(this.from.value, this.from.key).startOf("day");
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

    static na(years) {
        const na = new ChecklistItemStatus();
        na.to = {};
        na.to.key = "year";
        na.to.value = years;
        na.color = 'grey';
        na.state = 'Past Expiry';
        return na;
    }

    maxDate(baseDate) {
        return moment(baseDate).add(this.to.value, this.to.key).toDate();
    }
}

export default ChecklistItemStatus;