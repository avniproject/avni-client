import ReferenceEntity from "./ReferenceEntity";
import _ from 'lodash';
import General from "./utility/General";

class Program extends ReferenceEntity {
    static schema = {
        name: 'Program',
        primaryKey: 'uuid',
        properties: {
            uuid: 'string',
            name: 'string',
            operationalProgramName: {type: 'string', optional: true},
            displayName: 'string',
            colour: 'string',
            beneficiaryName: 'string',
        }
    };

    static fromResource(operationalProgram) {
        const program =  new Program();
        program.uuid = operationalProgram.programUUID;
        program.name = operationalProgram.programName;
        program.operationalProgramName = operationalProgram.name;
        program.colour = _.isNil(operationalProgram.colour)? Program.randomColour() : operationalProgram.colour;
        program.displayName = _.isEmpty(program.operationalProgramName) ? program.name : program.operationalProgramName;
        program.beneficiaryName = operationalProgram.beneficiaryName || operationalProgram.name || program.name;
        return program;
    }

    static randomColour() {
        return 'rgb(' + (Math.floor(Math.random() * 256)) + ',' + (Math.floor(Math.random() * 256)) + ',' + (Math.floor(Math.random() * 256)) + ')';
    }

    clone() {
        return General.assignFields(this,super.clone(new Program()),['operationalProgramName','displayName']);
    }

    static addTranslation(program, messageService) {
        messageService.addTranslation('en', program.displayName, program.displayName);
    }
}

export default Program;