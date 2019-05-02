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
        PROGRAM_ENCOUNTER: 'PROGRAM_ENCOUNTER'
    };

    constructor(id, type, parameters) {
        assertTrue(id, 'Id is mandatory');
        this.id = id;
        this.type = type;
        this.parameters = parameters;
    }

    validate(){
        assertTrue(WorkItem.type[this.type], 'Work item must be one of WorkItem.type');
        if (this.type !== WorkItem.type.REGISTRATION) {
            assertTrue(_.get(this.parameters, 'individualUUID'), this.wrapErrorMessage('individualUUID is mandatory'));
        }
        if (this.type === WorkItem.type.PROGRAM_ENROLMENT) {
            assertTrue(_.get(this.parameters, 'programName'), this.wrapErrorMessage('programName is mandatory'));
        }

        if (this.type === WorkItem.type.PROGRAM_ENCOUNTER) {
            assertTrue(_.get(this.parameters, 'programName'), this.wrapErrorMessage('programName is mandatory'));
        }
    }

    wrapErrorMessage(message) {
        let s = `Work Item id: ${this.id}, type: ${this.type}, parameters: ${JSON.stringify(this.parameters)}, errorMessage: ${message}`;
        console.log(s);
        return s;
    }
}