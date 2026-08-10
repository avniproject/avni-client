import _ from "lodash";

class StubbedDraftConfigService {
    constructor(serviceData) {
        this.serviceData = serviceData;
    }

    // All four derive from one flag, like the real service.
    isDraftEnabled() {
        return !!(this.serviceData && (this.serviceData.draftEnabled || this.serviceData.displayDrafts));
    }

    shouldSaveDraft(isFirstFlow, isExistingDraft) {
        return isExistingDraft || (isFirstFlow && this.isDraftEnabled());
    }

    shouldLoadDraft() {
        return this.isDraftEnabled();
    }

    shouldDisplayDrafts() {
        return this.isDraftEnabled();
    }
}

export default StubbedDraftConfigService;
