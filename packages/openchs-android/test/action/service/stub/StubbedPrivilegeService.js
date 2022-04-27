import StubbedBaseService from "./StubbedBaseService";

class StubbedPrivilegeService extends StubbedBaseService {
    constructor(serviceData) {
        super(serviceData);
    }

    hasEverSyncedGroupPrivileges() {
        return false
    }

    hasAllPrivileges() {
        return false
    }
}

export default StubbedPrivilegeService;
