import General from "../../src/utility/General";

class TestMyGroupsFactory {
    static createWithDefaults(overrides = {}) {
        return {
            uuid: General.randomUUID(),
            groupUuid: null,
            groupName: "Test Group",
            voided: false,
            ...overrides
        };
    }

    static createForGroup(groupUuid, groupName = "Admin Group") {
        return TestMyGroupsFactory.createWithDefaults({
            groupUuid: groupUuid,
            groupName: groupName
        });
    }
}

export default TestMyGroupsFactory;
