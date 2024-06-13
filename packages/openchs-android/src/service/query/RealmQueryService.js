import {ChecklistItem, Encounter, Individual, ProgramEncounter, ProgramEnrolment, Comment, Task, CustomFilter, AddressLevel} from "openchs-models";
import _ from "lodash";
import moment from "moment";

const locationBasedQueries = new Map();
locationBasedQueries.set(Individual.schema.name, "lowestAddressLevel.uuid = ");
locationBasedQueries.set(ProgramEnrolment.schema.name, "individual.lowestAddressLevel.uuid = ");
locationBasedQueries.set(ProgramEncounter.schema.name, "programEnrolment.individual.lowestAddressLevel.uuid = ");
locationBasedQueries.set(Encounter.schema.name, "individual.lowestAddressLevel.uuid = ");
locationBasedQueries.set(ChecklistItem.schema.name, "checklist.programEnrolment.individual.lowestAddressLevel.uuid = ");
locationBasedQueries.set(Comment.schema.name, "subject.lowestAddressLevel.uuid = ");
locationBasedQueries.set(Task.schema.name, "subject.lowestAddressLevel.uuid = ");

const genderQueryKeys = new Map();
genderQueryKeys.set(ProgramEncounter.schema.name, "programEnrolment.individual.gender.uuid");
genderQueryKeys.set(Encounter.schema.name, "individual.lowestAddressLevel.uuid");

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

    static filterBasedOnGenders(schema, entitiesResult, genders) {
        const orKeyValueQuery = RealmQueryService.orKeyValueQuery(genderQueryKeys.get(schema), genders.map((x) => x.uuid));
        if (_.isEmpty(orKeyValueQuery)) return entitiesResult;
        return entitiesResult.filtered(orKeyValueQuery);
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

    static getDateFilterFunction(selectedOptions, widget, queryColumn) {
        const {minValue, maxValue} = _.head(selectedOptions);
        const realmFormatDate = (value, time) => {
            const date = value || moment().format("YYYY-MM-DDTHH:mm:ss");
            return date.split('T')[0] + time;
        };
        if (widget === CustomFilter.widget.Range) {
            return () => ` ${queryColumn} >= ${realmFormatDate(minValue, '@00:00:00')} &&  ${queryColumn} <= ${realmFormatDate(maxValue, '@23:59:59')} `;
        } else {
            return () => ` ${queryColumn} == ${realmFormatDate(minValue, '@00:00:00')} `;
        }
    }
}

export default RealmQueryService;
