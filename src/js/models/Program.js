import ReferenceEntity from "./ReferenceEntity";

class Program extends ReferenceEntity {
    static schema = {
        name: 'Program',
        primaryKey: 'uuid',
        properties: {
            uuid: 'string',
            name: 'string',
        }
    };

    static fromResource(resource) {
        return ReferenceEntity.fromResource(resource, new Program());
    }

    clone() {
        return super.clone(new Program());
    }

    static addTranslation(program, messageService) {
        messageService.addTranslation('en', program.name, program.name);
    }
}

export default Program;