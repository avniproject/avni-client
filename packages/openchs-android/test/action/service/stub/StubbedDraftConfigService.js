class StubbedDraftConfigService {
    constructor(serviceData) {
        this.serviceData = serviceData;
    }

    isDraftEnabled() {
        return false;
    }

    shouldSaveDraft(isFirstFlow, isExistingDraft) {
        return false;
    }

    shouldLoadDraft() {
        return false;
    }

    shouldDisplayDrafts() {
        return false;
    }
}

export default StubbedDraftConfigService;
