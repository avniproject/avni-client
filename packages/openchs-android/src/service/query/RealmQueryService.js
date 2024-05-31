import {ChecklistItem, Encounter, Individual, ProgramEncounter, ProgramEnrolment, Comment, Task} from "openchs-models";
import _ from "lodash";
import AddressLevel from "../../views/common/AddressLevel";
import General from "../../utility/General";

const locationBasedQueries = new Map();
locationBasedQueries.set(Individual.schema.name, "lowestAddressLevel.uuid = ");
locationBasedQueries.set(ProgramEnrolment.schema.name, "individual.lowestAddressLevel.uuid = ");
locationBasedQueries.set(ProgramEncounter.schema.name, "programEnrolment.individual.lowestAddressLevel.uuid = ");
locationBasedQueries.set(Encounter.schema.name, "individual.lowestAddressLevel.uuid = ");
locationBasedQueries.set(ChecklistItem.schema.name, "checklist.programEnrolment.individual.lowestAddressLevel.uuid = ");
locationBasedQueries.set(Comment.schema.name, "subject.lowestAddressLevel.uuid = ");
locationBasedQueries.set(Task.schema.name, "subject.lowestAddressLevel.uuid = ");

class RealmQueryService {
    static orQuery(array) {
        return array.length > 0 ? '( ' + array.join(' OR ') + ' )' : '';
    }

    static orKeyValueQuery(key, valueArray) {
        return RealmQueryService.orQuery(valueArray.map((x) => `${key} = "${x}"`));
    }

    static andQuery(array) {
        const nonEmptyCriteria = _.filter(array, (x) => !_.isEmpty(x));
        return nonEmptyCriteria.length > 0 ? '( ' + nonEmptyCriteria.join(' AND ') + ' )' : '';
    }

    static filterBasedOnAddress(schema, entitiesResult, addressFilter) {
        if (!_.isNil(addressFilter) && !_.isNil(addressFilter.filterValue) && addressFilter.filterValue.length > 0) {
            const joinedQuery = addressFilter.filterValue.map((x: AddressLevel) => locationBasedQueries.get(schema) + `"${x.uuid}"`);
            return entitiesResult.filtered(RealmQueryService.orQuery(joinedQuery));
        }
        return entitiesResult;
    }

    static programEncounterCriteria(subjectTypes, programs, encounterTypes) {
        const subjectTypeQuery = RealmQueryService.orKeyValueQuery("programEnrolment.individual.subjectType.uuid", subjectTypes.map((x) => x.uuid));
        const programQuery = RealmQueryService.orKeyValueQuery("programEnrolment.program.uuid", programs.map((x) => x.uuid));
        const encounterTypeQuery = RealmQueryService.orKeyValueQuery("encounterType.uuid", encounterTypes.map((x) => x.uuid));
        return RealmQueryService.andQuery([subjectTypeQuery, programQuery, encounterTypeQuery]);
    }

    static generalEncounterCriteria(subjectTypes, encounterTypes) {
        const subjectTypeQuery = RealmQueryService.orKeyValueQuery("individual.subjectType.uuid", subjectTypes.map((x) => x.uuid));
        const encounterTypeQuery = RealmQueryService.orKeyValueQuery("encounterType.uuid", encounterTypes.map((x) => x.uuid));
        return RealmQueryService.andQuery([subjectTypeQuery, encounterTypeQuery]);
    }
}

export default RealmQueryService;
