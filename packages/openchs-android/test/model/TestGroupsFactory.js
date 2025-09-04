import General from "../../src/utility/General";

class TestGroupsFactory {
    static createWithDefaults(overrides = {}) {
        const uuid = General.randomUUID();
        return {
            uuid: uuid,
            name: "Test Admin Group",
            groupName: "Test Admin Group",
            groupUuid: uuid,
            hasAllPrivileges: true,
            voided: false,
            ...overrides
        };
    }

    static createAdminGroup() {
        const uuid = General.randomUUID();
        return TestGroupsFactory.createWithDefaults({
            uuid: uuid,
            name: "Admin Group",
            groupName: "Admin Group",
            groupUuid: uuid,
            hasAllPrivileges: true,
            voided: false,
        });
    }
}

export default TestGroupsFactory;
