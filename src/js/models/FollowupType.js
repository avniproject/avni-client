import General from "../utility/General";

class FollowupType {
    static schema = {
        name: 'FollowupType',
        primaryKey: 'uuid',
        properties: {
            uuid: 'string',
            name: 'string',
        }
    };

    static fromResource(resource) {
        return General.assignFields(resource, new FollowupType(), ["uuid", "name"]);
    }
}

export default FollowupType;