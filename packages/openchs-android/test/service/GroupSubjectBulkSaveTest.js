// addMembers is what a bulk add lands on. The contract that matters: one transaction whatever N
// is, one EntityQueue row per member that actually saved, and a single-element batch that is
// indistinguishable from the old addMember, because three callers still go through that name.

import {assert} from "chai";

jest.mock("../../src/framework/bean/Service", () => () => (target) => target);

import {GroupSubject} from "avni-models";
import {harness, member} from "./groupSubjectSaveHarness";

function bulkHarness(existingMembers, options) {
    const h = harness(existingMembers, options);
    const transactions = [];
    // transactionManager is a getter on BaseService, so it has to be shadowed, not assigned.
    Object.defineProperty(h.service, "transactionManager", {
        value: {
            write: (fn) => {
                transactions.push(1);
                return fn();
            }
        }
    });
    // buildGroupSubject re-reads the linked Individual/GroupRole rows; there is no DB here, so
    // the member object stands in for the entity it would have built.
    h.service.buildGroupSubject = (m) => m;
    return {...h, transactionCount: () => transactions.length};
}

const entityQueueRows = (created) => created.filter(c => c.schema === "EntityQueue");

describe("GroupSubjectService.addMembers", () => {
    it("saves every member in the batch", () => {
        const {service, savedGroupSubjects} = bulkHarness([]);

        service.addMembers([
            member({uuid: "gs1", memberUUID: "m1"}),
            member({uuid: "gs2", memberUUID: "m2"}),
            member({uuid: "gs3", memberUUID: "m3"}),
        ], false);

        assert.lengthOf(savedGroupSubjects(), 3);
    });

    it("opens one transaction regardless of batch size", () => {
        const one = bulkHarness([]);
        one.service.addMembers([member({uuid: "gs1", memberUUID: "m1"})], false);
        assert.strictEqual(one.transactionCount(), 1);

        const many = bulkHarness([]);
        many.service.addMembers([
            member({uuid: "gs1", memberUUID: "m1"}),
            member({uuid: "gs2", memberUUID: "m2"}),
            member({uuid: "gs3", memberUUID: "m3"}),
        ], false);
        assert.strictEqual(many.transactionCount(), 1, "a batch must not open one transaction per member");
    });

    it("queues one sync row per saved member", () => {
        const {service, created} = bulkHarness([]);

        service.addMembers([
            member({uuid: "gs1", memberUUID: "m1"}),
            member({uuid: "gs2", memberUUID: "m2"}),
        ], false);

        assert.lengthOf(entityQueueRows(created), 2);
    });

    it("a single-member batch does exactly what addMember does", () => {
        const viaAddMember = bulkHarness([]);
        viaAddMember.service.addMember(member({uuid: "gs1"}), false);

        const viaAddMembers = bulkHarness([]);
        viaAddMembers.service.addMembers([member({uuid: "gs1"})], false);

        assert.deepEqual(
            viaAddMembers.created.map(c => c.schema),
            viaAddMember.created.map(c => c.schema)
        );
        assert.strictEqual(viaAddMembers.transactionCount(), viaAddMember.transactionCount());
    });

    it("skips a member already in the group without dropping the rest of the batch", () => {
        const existing = [member({uuid: "gs0", memberUUID: "m2"})];
        const {service, savedGroupSubjects} = bulkHarness(existing);

        service.addMembers([
            member({uuid: "gs1", memberUUID: "m1"}),
            member({uuid: "gs2", memberUUID: "m2"}),
            member({uuid: "gs3", memberUUID: "m3"}),
        ], false);

        const savedMemberUUIDs = savedGroupSubjects().map(c => c.obj.memberSubject.uuid);
        assert.deepEqual(savedMemberUUIDs, ["m1", "m3"]);
    });

    it("sees rows written earlier in the same batch, so a repeated member is not written twice", () => {
        const {service, savedGroupSubjects} = bulkHarness([], {trackSaved: true});

        service.addMembers([
            member({uuid: "gs1", memberUUID: "m1"}),
            member({uuid: "gs2", memberUUID: "m1"}),
        ], false);

        assert.lengthOf(savedGroupSubjects(), 1, "the second row for m1 is a duplicate add");
    });

    it("writes the relative once for the batch, not once per member", () => {
        const {service} = bulkHarness([]);
        const addOrUpdateRelative = jest.fn();
        service.getService = (type) => type && type.name === "IndividualRelationshipService"
            ? {addOrUpdateRelative}
            : {findByUUID: () => ({addGroupSubject: jest.fn(), addGroup: jest.fn()})};

        service.addMembers([
            member({uuid: "gs1", memberUUID: "m1"}),
            member({uuid: "gs2", memberUUID: "m2"}),
        ], true, {isRelationPresent: () => true});

        assert.strictEqual(addOrUpdateRelative.mock.calls.length, 1);
    });
});
