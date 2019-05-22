import _ from 'lodash';

const assertTrue = (value, message) => {
    if (!value) {
        throw new Error(message);
    }
};

export default class WorkItem {
    static type = {
        REGISTRATION: 'REGISTRATION',
        ENCOUNTER: 'ENCOUNTER',
        PROGRAM_ENROLMENT: 'PROGRAM_ENROLMENT',
        PROGRAM_EXIT: 'PROGRAM_EXIT',
        PROGRAM_ENCOUNTER: 'PROGRAM_ENCOUNTER',
        CANCELLED_ENCOUNTER: 'CANCELLED_ENCOUNTER',
    };

    constructor(id, type, parameters) {
        assertTrue(id, 'Id is mandatory');
        this.id = id;
        this.type = type;
        this.parameters = parameters || {};
    }

    validate() {
        assertTrue(WorkItem.type[this.type], 'Work item must be one of WorkItem.type');
        if (this.type !== WorkItem.type.REGISTRATION) {
            this.ensureFieldExists('subjectUUID');
        }
        if (this.type === WorkItem.type.PROGRAM_ENROLMENT) {
            this.ensureFieldExists('programName');
        }
        if (this.type === WorkItem.type.PROGRAM_ENCOUNTER) {
            this.ensureFieldExists('encounterType');
        }
        if (this.type === WorkItem.type.ENCOUNTER) {
            this.ensureFieldExists('encounter');
        }
    }

    fieldMissingError(field) {
        return `Work Item id: ${this.id}, type: ${this.type}, ` +
            `parameters: {${Object.keys(this.parameters)}}, ` +
            `'${field}: ${this.parameters[field]}', ` +
            `errorMessage: '${field} is mandatory'`;
    }

    ensureFieldExists(field) {
        assertTrue(_.get(this.parameters, field), this.fieldMissingError(field));
    }
}