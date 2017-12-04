import ReferenceEntity from "./ReferenceEntity";
import _ from 'lodash';

class Program extends ReferenceEntity {
    static schema = {
        name: 'Program',
        primaryKey: 'uuid',
        properties: {
            uuid: 'string',
            name: 'string',
            colour: 'string'
        }
    };

    static fromResource(resource) {
        const program =  ReferenceEntity.fromResource(resource, new Program());
        program.uuid = resource.programUUID;
        program.colour = _.isNil(resource.colour)? Program.randomColour() : resource.colour;
        return program;
    }

    static randomColour() {
        return 'rgb(' + (Math.floor(Math.random() * 256)) + ',' + (Math.floor(Math.random() * 256)) + ',' + (Math.floor(Math.random() * 256)) + ')';
    }

    clone() {
        return super.clone(new Program());
    }

    static addTranslation(program, messageService) {
        messageService.addTranslation('en', program.name, program.name);
    }
}

export default Program;