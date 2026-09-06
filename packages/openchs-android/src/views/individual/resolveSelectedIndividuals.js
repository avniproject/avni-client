import _ from "lodash";

// Members picked on an earlier trip through search are not in the current result set, so they have
// to be resolved from what was carried in rather than quietly dropped. A row present in both is
// taken from the results, which is the fresher copy.
export default function resolveSelectedIndividuals(selectedUUIDs, searchResults, carriedInMembers, hydrate) {
    const inResults = _.keyBy(searchResults, 'uuid');
    const carriedIn = _.keyBy(carriedInMembers, 'uuid');
    return _.compact(_.map(selectedUUIDs, uuid => {
        const item = inResults[uuid];
        return item ? hydrate(item) : carriedIn[uuid];
    }));
}
