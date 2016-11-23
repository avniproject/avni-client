import General from "../utility/General";

class Gender {
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