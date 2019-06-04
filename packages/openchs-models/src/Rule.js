import ReferenceEntity from "./ReferenceEntity";
import General from "./utility/General";

class Rule extends ReferenceEntity {
    static schema = {
        name: "Rule",
        primaryKey: 'uuid',
        properties: {
            uuid: 'string',
            _entityString: 'string',
            type: 'string',
            name: 'string',
            fnName: 'string',
            executionOrder: 'double',
            voided: {type: 'bool', default: false},
            data: {type: 'string', optional: true}
        }
    };

    static types = {
        Decision: "Decision",
        VisitSchedule: "VisitSchedule",
        ViewFilter: "ViewFilter",
        Checklists: "Checklists",
        Validation: "Validation",
        EnrolmentSummary: "EnrolmentSummary",
    };

    static fromResource(resource, entityService) {
        const rule = General.assignFields(resource, new Rule(), ['uuid', 'name', 'type', 'fnName', 'executionOrder', 'entity']);
        rule.data = JSON.stringify(resource['data']);
        rule.voided = !!resource.voided;
        return rule;
    }

    get entity() {
        return JSON.parse(this._entityString || '{}');
    }

    set entity(entityJson) {
        this._entityString = JSON.stringify(entityJson || {});
    }

    clone() {
        return super.clone(new Rule());
    }

}

export default Rule;
