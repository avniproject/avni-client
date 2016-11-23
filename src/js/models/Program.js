import General from "../utility/General";

class Program {
    static schema = {
        name: 'Program',
        primaryKey: 'uuid',
        properties: {
            uuid: 'string',
            name: 'string',
        }
    };

    static fromResource(resource) {
        return General.assignFields(resource, new Program(), ["uuid", "name"]);
    }
}

export default Program;