import StubbedBaseService from "./StubbedBaseService";
import {Settings} from 'avni-models';

class StubbedOrganisationConfigService extends StubbedBaseService {
    constructor(serviceData) {
        super(serviceData);
    }

    isSaveDraftOn() {
        return false;
    }
}

export default StubbedOrganisationConfigService;