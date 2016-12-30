import General from "../utility/General";
import BaseEntity from "./BaseEntity";

class Gender extends BaseEntity {
    static schema = {
        name: "Gender",
        primaryKey: 'uuid',
        properties: {
            uuid: "string",
            name: "string"
        }
    };

    static fromResource(resource) {
        return General.assignFields(resource, new Gender(), ["uuid", "name"]);
    }
}

export default Gender;