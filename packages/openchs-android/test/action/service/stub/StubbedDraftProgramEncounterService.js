import StubbedBaseService from "./StubbedBaseService";

// Enrolment-scoped sibling of StubbedDraftEncounterService ([] for nil; filter by enrolmentUuid when tagged).
class StubbedDraftProgramEncounterService extends StubbedBaseService {
    listUnScheduledDrafts(enrolment) {
        if (!enrolment || !enrolment.uuid) return [];
        const drafts = this.serviceData.unScheduledProgramDrafts || [];
        if (drafts.some(d => d && d.enrolmentUuid !== undefined)) {
            return drafts.filter(d => d.enrolmentUuid === enrolment.uuid);
        }
        return drafts;
    }

    deleteDraftByUUID(uuid) {
        // no-op in tests
    }
}

export default StubbedDraftProgramEncounterService;
