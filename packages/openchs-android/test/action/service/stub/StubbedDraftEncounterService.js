import StubbedBaseService from "./StubbedBaseService";

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

    deleteDraftByUUID(uuid) {
        // no-op in tests
    }
}

export default StubbedDraftEncounterService;
