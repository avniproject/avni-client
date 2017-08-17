import StubbedBaseService from "./StubbedBaseService";
import _ from 'lodash';

class StubbedSettingsService extends StubbedBaseService {
    constructor(serviceData) {
        super(serviceData);
    }

    getSettings() {
        return {validate: _.noop};
    }
}

export default StubbedSettingsService;