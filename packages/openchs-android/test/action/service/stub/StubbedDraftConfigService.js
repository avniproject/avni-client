import _ from "lodash";

class StubbedDraftConfigService {
    constructor(serviceData) {
        this.serviceData = serviceData;
    }

    isDraftEnabled() {
        return _.get(this.serviceData, 'draftEnabled', false);
    }

    shouldSaveDraft(isFirstFlow, isExistingDraft) {
        return isExistingDraft || (isFirstFlow && this.isDraftEnabled());
    }

    shouldLoadDraft() {
        return this.isDraftEnabled();
    }

    shouldDisplayDrafts() {
        return false;
    }
}

export default StubbedDraftConfigService;
