import General from "./utility/General";
import StringKeyNumericValue from "./application/StringKeyNumericValue";

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

    static create() {
        let checklistItemStatus = new ChecklistItemStatus();
        checklistItemStatus.uuid = General.randomUUID();
        checklistItemStatus.color = 'yellow';
        checklistItemStatus.from = new StringKeyNumericValue();
        checklistItemStatus.to = new StringKeyNumericValue();
        return checklistItemStatus;
    }

    static VALID_KEYS = ['day', 'week', 'month', 'year']
        .map((k) => [`${k}s`, k])
        .reduce((acc, ks) => acc.concat(ks), []);
}

export default ChecklistItemStatus;