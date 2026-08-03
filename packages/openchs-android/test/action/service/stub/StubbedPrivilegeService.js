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

    allowedEntityTypeUUIDListForCriteria(criteria, key) {
        return (this.serviceData && this.serviceData.allowedEntityTypeUuids) || [];
    }
}

export default StubbedPrivilegeService;
