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

    static formatDateString(value, time) {
        const date = value || moment().format("YYYY-MM-DDTHH:mm:ss");
        return date.split('T')[0] + time;
    }

    static toMidnight(date) {
        return moment(date).startOf('day').format('YYYY-MM-DD@HH:mm:ss');
    }

    static getDateFilterFunctionV1(selectedOptions, widget, queryColumn) {
        const {minValue, maxValue} = _.head(selectedOptions);
        if (widget === CustomFilter.widget.Range) {
            return () => ` ${queryColumn} >= ${RealmQueryService.formatDateString(minValue, '@00:00:00')} &&  ${queryColumn} <= ${RealmQueryService.formatDateString(maxValue, '@23:59:59')} `;
        } else {
            return () => ` ${queryColumn} == ${RealmQueryService.formatDateString(minValue, '@00:00:00')} `;
        }
    }

    static getMatchAllEntitiesQuery() {
        return 'uuid != null';
    }

    static getDateForStringLikeMatching(date) {
        return moment(date).format("YYYY-MM-DD");
    }

    static getDateTimeForStringLikeMatching(date) {
        return moment(date).format("YYYY-MM-DDTHH:mm:ss");
    }
}

export default RealmQueryService;
