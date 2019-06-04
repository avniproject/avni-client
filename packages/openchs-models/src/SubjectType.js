import ReferenceEntity from "./ReferenceEntity";
import General from "./utility/General";

class SubjectType extends ReferenceEntity {
    static schema = {
        name: 'SubjectType',
        primaryKey: 'uuid',
        properties: {
            uuid: 'string',
            name: 'string',
            voided: { type: 'bool', default: false }
        }
    };

    static create(name) {
        let subjectType = new SubjectType();
        subjectType.uuid = General.randomUUID();
        subjectType.name = name;
        return subjectType;
    }

    static fromResource(operationalSubjectType) {
        const subjectType = new SubjectType();
        //assuming here that the base name is not needed. When needed we will introduce it.
        subjectType.name = operationalSubjectType.name;
        subjectType.uuid = operationalSubjectType.subjectTypeUUID;
        subjectType.voided = !!operationalSubjectType.voided;
        return subjectType;
    }

    clone() {
        const cloned = new SubjectType();
        cloned.uuid = this.uuid;
        cloned.name = this.name;
        cloned.voided = this.voided;
        return cloned;
    }

    isIndividual(){
        return this.name === 'Individual' || this.name === 'Patient';
    }

    registerIcon() {
        return this.isIndividual() ? 'account-plus' : 'plus-box';
    }

}

export default SubjectType;