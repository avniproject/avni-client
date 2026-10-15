import StubbedBaseService from "./StubbedBaseService";
import _ from "lodash";

class StubbedDraftEncounterService extends StubbedBaseService {
    // Subject-scoped like the real service ([] for nil; filter by individualUuid when tagged).
    listUnScheduledDrafts(individual) {
        if (!individual || !individual.uuid) return [];
        const drafts = this.serviceData.unScheduledDrafts || [];
        if (drafts.some(d => d && d.individualUuid !== undefined)) {
            return drafts.filter(d => d.individualUuid === individual.uuid);
        }
        return drafts;
    }

    // Like the real lookup: serviceData.draftEncounter, if it sits in this visit's slot (subject, visit type, scheduled date).
    findDraftFor(encounter) {
        const draft = _.get(this.serviceData, 'draftEncounter');
        if (_.isNil(draft) || _.isNil(encounter)) return null;
        const sameSlot = draft.individual.uuid === encounter.individual.uuid
            && draft.encounterType.uuid === encounter.encounterType.uuid
            && _.isEqual(draft.earliestVisitDateTime || null, encounter.earliestVisitDateTime || null);
        return sameSlot ? draft : null;
    }

    // Drafts only, like the real service: a saved visit with this uuid is not a draft.
    findByUUID(uuid) {
        const draft = _.get(this.serviceData, 'draftEncounter');
        return draft && draft.uuid === uuid ? draft : undefined;
    }

    deleteDraftByUUID(uuid) {
        // no-op in tests
    }
}

export default StubbedDraftEncounterService;
