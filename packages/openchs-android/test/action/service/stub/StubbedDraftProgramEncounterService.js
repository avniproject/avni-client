import StubbedBaseService from "./StubbedBaseService";
import _ from "lodash";

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

    // Like the real lookup: serviceData.draftProgramEncounter, if it sits in this visit's slot (enrolment, visit type, scheduled date).
    findDraftFor(programEncounter) {
        const draft = _.get(this.serviceData, 'draftProgramEncounter');
        if (_.isNil(draft) || _.isNil(programEncounter)) return null;
        const sameSlot = draft.programEnrolment.uuid === programEncounter.programEnrolment.uuid
            && draft.encounterType.uuid === programEncounter.encounterType.uuid
            && _.isEqual(draft.earliestVisitDateTime || null, programEncounter.earliestVisitDateTime || null);
        return sameSlot ? draft : null;
    }

    deleteDraftByUUID(uuid) {
        // no-op in tests
    }
}

export default StubbedDraftProgramEncounterService;
