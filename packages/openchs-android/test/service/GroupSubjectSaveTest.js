// saveGroupSubject must distinguish an EDIT of an existing membership (same uuid ->
// upsert) from a duplicate ADD of the same member under a fresh uuid (skip). Editing
// membershipStartDate was silently dropped, which #1983 made visible: the roster
// filters on membershipStartDate, so the stale date kept the member off the sheet.

import {assert} from "chai";

jest.mock("../../src/framework/bean/Service", () => () => (target) => target);

import {GroupSubject} from "avni-models";
import GroupSubjectService from "../../src/service/GroupSubjectService";

const individualStub = () => ({addGroupSubject: jest.fn(), addGroup: jest.fn()});

function harness(existingMembers) {
    const service = Object.create(GroupSubjectService.prototype);
    service.getGroupSubjects = () => existingMembers;
    service.getService = () => ({findByUUID: () => individualStub()});
    const created = [];
    const db = {
        create: (schema, obj) => {
            created.push({schema, obj});
            return obj;
        }
    };
    return {service, db, savedGroupSubjects: () => created.filter(c => c.schema === GroupSubject.schema.name)};
}

const member = ({uuid, memberUUID = "m1", start = null, voided = false}) => ({
    uuid,
    groupSubject: {uuid: "g1"},
    memberSubject: {uuid: memberUUID},
    membershipStartDate: start,
    membershipEndDate: null,
    voided,
});

describe("GroupSubjectService.saveGroupSubject", () => {
    it("persists an edit to membershipStartDate on an existing membership (same uuid)", () => {
        const existing = [member({uuid: "gs1", start: new Date(2026, 6, 9)})];
        const {service, db, savedGroupSubjects} = harness(existing);

        const edited = member({uuid: "gs1", start: new Date(2026, 6, 8)});
        service.saveGroupSubject(db, edited);

        const saved = savedGroupSubjects();
        assert.lengthOf(saved, 1, "the edited membership must be written to Realm");
        assert.strictEqual(saved[0].obj.membershipStartDate.getDate(), 8);
    });

    it("skips a duplicate add of the same member under a fresh uuid", () => {
        const existing = [member({uuid: "gs1"})];
        const {service, db, savedGroupSubjects} = harness(existing);

        service.saveGroupSubject(db, member({uuid: "gs2"}));

        assert.lengthOf(savedGroupSubjects(), 0, "must not create a second membership row");
    });

    it("creates a brand new membership", () => {
        const {service, db, savedGroupSubjects} = harness([]);

        service.saveGroupSubject(db, member({uuid: "gs1"}));

        assert.lengthOf(savedGroupSubjects(), 1);
    });

    it("always saves a voided membership (#1772)", () => {
        const existing = [member({uuid: "gs1"})];
        const {service, db, savedGroupSubjects} = harness(existing);

        service.saveGroupSubject(db, member({uuid: "gs1", voided: true}));

        assert.lengthOf(savedGroupSubjects(), 1);
    });
});
