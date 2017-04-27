import StubbedBaseService from "./StubbedBaseService";

class StubbedSettingsService extends StubbedBaseService {
    constructor(serviceData) {
        super(serviceData);
    }

    getSettings() {
        return {};
    }
}

export default StubbedSettingsService;