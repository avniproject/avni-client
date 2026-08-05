import _ from "lodash";

class EncounterSelectFormElementHelper {

    // Filters the subject's own encounters rather than resolving the rule's uuids, so a
    // rule cannot introduce an encounter outside this element's subject and encounter type.
    static applicableEncounters(encounters, answersToShow, answersToExclude) {
        const applicable = _.isEmpty(answersToShow) ? encounters :
            _.filter(encounters, ({uuid}) => _.includes(answersToShow, uuid));
        return _.isEmpty(answersToExclude) ? applicable :
            _.filter(applicable, ({uuid}) => !_.includes(answersToExclude, uuid));
    }
}

export default EncounterSelectFormElementHelper;
