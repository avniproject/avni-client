import StubbedBaseService from "./StubbedBaseService";

class StubbedDraftEncounterService extends StubbedBaseService {
    listUnScheduledDrafts(individual) {
        return this.serviceData.unScheduledDrafts || [];
    }
}

export default StubbedDraftEncounterService;
