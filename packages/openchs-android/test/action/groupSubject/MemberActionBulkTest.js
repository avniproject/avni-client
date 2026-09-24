// Bulk add reuses the single-add screen, so the suppression conditions are the load-bearing
// part: a household, an edit of an existing membership and a worklist wizard must all keep
// the one-at-a-time flow.

import {assert} from "chai";

jest.mock("../../../src/framework/bean/Service", () => () => (target) => target);

const eligibilityByUUID = {};
const eligibilityCalls = [];
jest.mock("../../../src/action/individual/IndividualRegistrationDetailsActions", () => ({
    IndividualRegistrationDetailsActions: {
        checkMemberAdditionEligibility: (member) => {
            eligibilityCalls.push(member.uuid);
            return eligibilityByUUID[member.uuid] || {isDisallowed: () => false, getMessage: () => null};
        }
    }
}));

import {MemberAction} from "../../../src/action/groupSubject/MemberAction";
import {ValidationResult} from "avni-models";

const STUDENT = {uuid: "st-student"};
const ROLE = {uuid: "r1", role: "Student", memberSubjectType: STUDENT, maximumNumberOfMembers: null};

const subject = ({uuid, voided = false, subjectType = STUDENT}) => ({uuid, name: uuid, voided, subjectType});

const existingMembership = (memberUUID, roleUUID = "r1") => ({
    voided: false,
    memberSubject: {uuid: memberUUID},
    groupRole: {uuid: roleUUID}
});

const group = ({household = false, members = []} = {}) => ({
    uuid: "g1",
    subjectType: {uuid: "st-class"},
    isHousehold: () => household,
    getHeadOfHouseholdGroupSubject: () => undefined,
    groupSubjects: members
});

const context = (groupRoles = [ROLE]) => ({
    get: (type) => {
        const name = type && type.name;
        if (name === "GroupSubjectService") return {
            getGroupRoles: () => groupRoles,
            findByUUID: () => ({uuid: "gs1", groupSubject: group(), memberSubject: subject({uuid: "m1"}), groupRole: ROLE})
        };
        return {loadAllNonVoided: () => []};
    }
});

const loadedState = ({household = false, members = [], workLists, cap = null} = {}) => {
    const role = {...ROLE, maximumNumberOfMembers: cap};
    const state = MemberAction.onLoad(
        MemberAction.getInitialState(context()),
        {groupSubject: group({household, members}), workLists},
        context([role])
    );
    state.member.groupRole = role;
    return state;
};

const select = (state, subjects) => MemberAction.addMembers(state, {value: subjects}, context());
const messages = (row) => row.validationResults.map(r => r.messageKey);

beforeEach(() => {
    Object.keys(eligibilityByUUID).forEach(k => delete eligibilityByUUID[k]);
    eligibilityCalls.length = 0;
});

describe("MemberAction bulk add — when it is offered", () => {
    it("is offered on a plain group", () => {
        assert.isTrue(loadedState().bulkAddEnabled);
    });

    it("is not offered on a household, where each member needs their own relation", () => {
        assert.isFalse(loadedState({household: true}).bulkAddEnabled);
    });

    it("is not offered inside a worklist wizard, which carries one member to registration", () => {
        assert.isFalse(loadedState({workLists: {}}).bulkAddEnabled);
    });

    it("is not offered when editing an existing membership", () => {
        const state = MemberAction.onLoad(
            MemberAction.getInitialState(context()),
            {params: {groupSubject: {uuid: "gs1", membershipStartDate: null, membershipEndDate: null}}},
            context()
        );
        assert.isFalse(state.bulkAddEnabled);
    });
});

describe("MemberAction.onLoad — reading the existing membership", () => {
    it("survives a membership whose member subject never synced (#1279)", () => {
        const partial = [existingMembership("m1"), {voided: false, groupRole: {uuid: "r1"}}];
        const state = loadedState({members: partial});
        assert.deepEqual(state.excludedMemberUUIDs, ["m1"]);
        assert.strictEqual(state.existingMemberCountByRoleUUID["r1"], 2);
    });
});

describe("MemberAction.addMembers", () => {
    it("keeps one row per person, in the order they were picked", () => {
        const state = select(loadedState(), [subject({uuid: "m1"}), subject({uuid: "m2"})]);
        assert.deepEqual(state.selectedMembers.map(({memberSubject}) => memberSubject.uuid), ["m1", "m2"]);
    });

    it("collapses a person picked twice", () => {
        const state = select(loadedState(), [subject({uuid: "m1"}), subject({uuid: "m1"})]);
        assert.lengthOf(state.selectedMembers, 1);
    });

    it("caps the batch so one dispatch cannot run unbounded rule evaluations", () => {
        const many = _range(MemberAction.MAX_BULK_SELECTION + 10).map(i => subject({uuid: `m${i}`}));
        assert.lengthOf(select(loadedState(), many).selectedMembers, MemberAction.MAX_BULK_SELECTION);
    });

    it("flags a deleted subject without touching the people around them", () => {
        const state = select(loadedState(), [subject({uuid: "m1"}), subject({uuid: "m2", voided: true}), subject({uuid: "m3"})]);
        assert.deepEqual(messages(state.selectedMembers[0]), []);
        assert.include(messages(state.selectedMembers[1]), "voidedIndividualAlertMessage");
        assert.deepEqual(messages(state.selectedMembers[2]), []);
    });

    it("flags someone already in the group", () => {
        const state = loadedState({members: [existingMembership("m1")]});
        assert.include(messages(select(state, [subject({uuid: "m1"})]).selectedMembers[0]), "memberAlreadyAddedMessage");
    });

    it("flags a subject whose type cannot hold the role, which reporting would drop silently", () => {
        const state = select(loadedState(), [subject({uuid: "m1", subjectType: {uuid: "st-teacher"}})]);
        assert.include(messages(state.selectedMembers[0]), "memberSubjectTypeMismatchMessage");
    });

    it("puts the org rule's own message against the person it rejected", () => {
        eligibilityByUUID["m2"] = {isDisallowed: () => true, getMessage: () => "notInThisStandard"};
        const state = select(loadedState(), [subject({uuid: "m1"}), subject({uuid: "m2"})]);
        assert.deepEqual(messages(state.selectedMembers[0]), []);
        assert.deepEqual(messages(state.selectedMembers[1]), ["notInThisStandard"]);
    });
});

describe("MemberAction bulk add — the role's member cap", () => {
    it("spends the remaining headroom and blocks the rest by name", () => {
        const state = loadedState({cap: 4, members: [existingMembership("x1"), existingMembership("x2")]});
        const picked = select(state, [1, 2, 3, 4, 5].map(i => subject({uuid: `m${i}`})));
        assert.deepEqual(messages(picked.selectedMembers[0]), []);
        assert.deepEqual(messages(picked.selectedMembers[1]), []);
        assert.include(messages(picked.selectedMembers[2]), "maxLimitReachedMsg");
        assert.include(messages(picked.selectedMembers[4]), "maxLimitReachedMsg");
    });

    it("does not limit a role that declares no cap", () => {
        const picked = select(loadedState(), [1, 2, 3].map(i => subject({uuid: `m${i}`})));
        picked.selectedMembers.forEach(row => assert.deepEqual(messages(row), []));
    });

    it("blocks a group already over its cap rather than letting it grow further", () => {
        const state = loadedState({cap: 1, members: [existingMembership("x1"), existingMembership("x2")]});
        assert.include(messages(select(state, [subject({uuid: "m1"})]).selectedMembers[0]), "maxLimitReachedMsg");
    });

    it("gives the headroom back when someone is removed from the selection", () => {
        const state = loadedState({cap: 2});
        const picked = select(state, [subject({uuid: "m1"}), subject({uuid: "m2"}), subject({uuid: "m3"})]);
        assert.include(messages(picked.selectedMembers[2]), "maxLimitReachedMsg");

        const after = MemberAction.removeSelectedMember(picked, {memberSubjectUUID: "m1"}, context());
        assert.deepEqual(after.selectedMembers.map(({memberSubject}) => memberSubject.uuid), ["m2", "m3"]);
        after.selectedMembers.forEach(row => assert.deepEqual(messages(row), []));
    });
});

describe("MemberAction bulk add — cost", () => {
    it("asks the org rule about each person once, however often the selection is rebuilt", () => {
        const state = loadedState();
        const three = [1, 2, 3].map(i => subject({uuid: `m${i}`}));
        const picked = select(state, three);
        const afterRemove = MemberAction.removeSelectedMember(picked, {memberSubjectUUID: "m1"}, context());
        select(afterRemove, three);
        assert.deepEqual(eligibilityCalls.sort(), ["m1", "m2", "m3"]);
    });
});

describe("MemberAction.saveableMembers", () => {
    it("hands over only the people who passed, each without a uuid of its own", () => {
        eligibilityByUUID["m2"] = {isDisallowed: () => true, getMessage: () => "no"};
        const picked = select(loadedState(), [subject({uuid: "m1"}), subject({uuid: "m2"})]);
        const saveable = MemberAction.saveableMembers(picked);
        assert.lengthOf(saveable, 1);
        assert.strictEqual(saveable[0].memberSubject.uuid, "m1");
        assert.isUndefined(saveable[0].uuid, "a shared uuid would upsert one row instead of adding many");
        assert.strictEqual(saveable[0].groupRole.uuid, "r1");
    });
});


describe("MemberAction.addRole — changing the role after members are picked", () => {
    const TEACHER = {uuid: "st-teacher"};

    it("re-judges every row against the role that will actually be stamped on them", () => {
        const monitor = {uuid: "r2", role: "Monitor", memberSubjectType: TEACHER, maximumNumberOfMembers: 1};
        const picked = select(loadedState(), [subject({uuid: "m1"}), subject({uuid: "m2"})]);
        picked.groupRoles = [picked.member.groupRole, monitor];

        const after = MemberAction.addRole(picked, {value: monitor}, context([monitor]));

        after.selectedMembers.forEach(row =>
            assert.include(messages(row), "memberSubjectTypeMismatchMessage",
                "students cannot hold a role whose member type is Teacher"));
        assert.lengthOf(MemberAction.saveableMembers(after), 0);
    });

    it("re-applies the new role's cap to the standing selection", () => {
        const capped = {...ROLE, uuid: "r3", maximumNumberOfMembers: 1};
        const picked = select(loadedState(), [subject({uuid: "m1"}), subject({uuid: "m2"})]);

        const after = MemberAction.addRole(picked, {value: capped}, context([capped]));

        assert.deepEqual(messages(after.selectedMembers[0]), []);
        assert.include(messages(after.selectedMembers[1]), "maxLimitReachedMsg");
    });

    it("leaves an untouched screen alone", () => {
        const fresh = loadedState();
        assert.deepEqual(MemberAction.addRole(fresh, {value: ROLE}, context()).selectedMembers, []);
    });
});

describe("MemberAction.onSave — the batch's shared fields", () => {
    const savingContext = (saved) => ({
        get: (type) => {
            const name = type && type.name;
            if (name === "GroupSubjectService") return {addMembers: (members) => saved.push(...members)};
            return {loadAllNonVoided: () => []};
        }
    });

    it("saves the eligible members", () => {
        const saved = [];
        const picked = select(loadedState(), [subject({uuid: "m1"}), subject({uuid: "m2"})]);
        MemberAction.onSave(picked, {cb: () => {}}, savingContext(saved));
        assert.deepEqual(saved.map(m => m.memberSubject.uuid), ["m1", "m2"]);
    });

    it("reports the number actually written, not the number handed over", () => {
        // addMembers returns what saveGroupSubject accepted; it skips a member the group already has.
        const reported = [];
        const writingOne = {get: (type) => (type && type.name) === "GroupSubjectService"
            ? {addMembers: () => 1} : {loadAllNonVoided: () => []}};
        const picked = select(loadedState(), [subject({uuid: "m1"}), subject({uuid: "m2"})]);

        MemberAction.onSave(picked, {cb: (n) => reported.push(n)}, writingOne);

        assert.deepEqual(reported, [1], "saying 2 when one was skipped would be a lie to the user");
    });

    it("refuses the whole batch when a shared field is invalid, e.g. the start date was cleared", () => {
        const saved = [];
        const picked = select(loadedState(), [subject({uuid: "m1"}), subject({uuid: "m2"})]);
        picked.validationResults = [ValidationResult.failure("MEMBERSHIP_START_DATE", "emptyValidationMessage")];

        MemberAction.onSave(picked, {cb: () => assert.fail("must not report a save")}, savingContext(saved));

        assert.lengthOf(saved, 0, "every row would have been written with no membershipStartDate");
    });
});

function _range(n) {
    return Array.from({length: n}, (_, i) => i);
}
