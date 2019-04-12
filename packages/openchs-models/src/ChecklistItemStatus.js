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
            displayOrder: 'double',
            start: 'int',
            end: 'int'
        }
    };

    static fromResource(resource, entityService) {
        const checklistItemStatus = General.assignFields(
            resource,
            new ChecklistItemStatus(),
            ['state', 'color', 'displayOrder', 'start', 'end']
        );
        const [toK, toV] = Object.entries(resource["to"])[0];
        const [fromK, fromV] = Object.entries(resource["from"])[0];
        checklistItemStatus.to = StringKeyNumericValue.fromResource(toK, toV);
        checklistItemStatus.from = StringKeyNumericValue.fromResource(fromK, fromV);
        return checklistItemStatus;
    }

    static get completed() {
        const completed = new ChecklistItemStatus();
        completed.color = 'green';
        completed.state = 'Completed';
        return completed;
    }

    static get expired() {
        const expired = new ChecklistItemStatus();
        expired.color = "grey";
        expired.state = "Expired";
        return expired;
    }

    static na(years) {
        const na = new ChecklistItemStatus();
        na.to = {};
        na.displayOrder = 999;
        na.to.key = "year";
        na.to.value = years;
        na.from = {};
        na.from.key = "year";
        na.from.value = years;
        na.color = 'grey';
        na.state = 'Past Expiry';
        return na;
    }

    fromDate(baseDate) {
        return moment(baseDate).add(this.from.value, this.from.key).toDate();
    }
}

export default ChecklistItemStatus;