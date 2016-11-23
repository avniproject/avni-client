import General from "../utility/General";

class ProgramEnrolment {
    static schema = {
        name: 'ProgramEnrolment',
        primaryKey: 'uuid',
        properties: {
            uuid: 'string',
            programUUID: 'string',
            individualUUID: 'string'
        }
    };

    static fromResource(resource) {
        var programEnrolment = new ProgramEnrolment();
        General.assignFields(resource, programEnrolment, ["uuid"], [], ["programUUID", "individualUUID"]);
        return programEnrolment;
    }
}

export default ProgramEnrolment;