import _ from "lodash";

class AttendanceFormElementHelper {

    static sortByName(groupSubjects) {
        return _.sortBy(groupSubjects, ({memberSubject}) => _.toLower(memberSubject.nameString));
    }

    static matchingName(groupSubjects, searchText) {
        const searchWords = _.toLower(searchText).split(/[ \-:]+/).filter(Boolean);
        if (_.isEmpty(searchWords)) return groupSubjects;
        return _.filter(groupSubjects, ({memberSubject}) => {
            const nameLowerCase = _.toLower(memberSubject.nameString);
            return _.every(searchWords, (word) => _.includes(nameLowerCase, word));
        });
    }
}

export default AttendanceFormElementHelper;
