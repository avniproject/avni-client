import ReferenceEntity from "./ReferenceEntity";

class ProgramOutcome extends ReferenceEntity {
    static schema = {
        name: 'ProgramOutcome',
        primaryKey: 'uuid',
        properties: {
            uuid: 'string',
            name: 'string'
        }
    };
}

export default ProgramOutcome;