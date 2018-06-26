import ReferenceEntity from "./ReferenceEntity";
import General from "./utility/General";

class RuleDependency extends ReferenceEntity {
    static noop = "{}";
    static schema = {
        name: "RuleDependency",
        primaryKey: 'uuid',
        properties: {
            uuid: 'string',
            code: 'string'
        }
    };

    static fromResource(resource, entityService) {
        return General.assignFields(resource, new RuleDependency(), ['uuid', 'code']);
    }

    static getCode(ruleDependency) {
        return _.isEmpty(ruleDependency) ? RuleDependency.noop : ruleDependency.code;
    }

    clone() {
        return super.clone(new RuleDependency());
    }

}

export default RuleDependency;