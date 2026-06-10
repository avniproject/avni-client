import RealmRepository from './RealmRepository';
import {Individual} from 'openchs-models';

class IndividualRepository extends RealmRepository {
    constructor(db) {
        super(db, Individual.schema.name);
    }

    searchByName(name) {
        return this.findAll().filtered('name CONTAINS[c] $0', name).sorted('name');
    }

    findNonVoidedBySubjectType(subjectTypeUUID) {
        return this.getAllNonVoided().filtered('subjectType.uuid = $0', subjectTypeUUID);
    }

    findByAddress(addressUUID, subjectTypeName) {
        return this.getAllNonVoided()
            .filtered('lowestAddressLevel.uuid = $0 and subjectType.name = $1', addressUUID, subjectTypeName);
    }
}

export default IndividualRepository;
