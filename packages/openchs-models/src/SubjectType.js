import ReferenceEntity from "./ReferenceEntity";
import General from "./utility/General";
import _ from 'lodash';

class SubjectType extends ReferenceEntity {
    static schema = {
        name: 'SubjectType',
        primaryKey: 'uuid',
        properties: {
            uuid: 'string',
            name: 'string',
            operationalSubjectTypeName: {type: 'string', optional: true},
            displayName: 'string',
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
        subjectType.name = operationalSubjectType.subjectTypeName;
        subjectType.uuid = operationalSubjectType.subjectTypeUUID;
        subjectType.voided = !!operationalSubjectType.subjectTypeVoided;
        subjectType.operationalSubjectTypeName = operationalSubjectType.name;
        subjectType.displayName = _.isEmpty(subjectType.operationalSubjectTypeName) ? subjectType.name : subjectType.operationalSubjectTypeName;
        return subjectType;
    }

    clone() {
        return General.assignFields(this,super.clone(new SubjectType()),['operationalSubjectTypeName','displayName']);
    }

    isIndividual(){
        return this.name === 'Individual';
    }

    registerIcon() {
        return this.isIndividual() ? 'account-plus' : 'plus-box';
    }

}

export default SubjectType;