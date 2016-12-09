class ProgramOutcome {
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