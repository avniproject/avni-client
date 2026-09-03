// saveGroupSubject must distinguish an EDIT of an existing membership (same uuid ->
// upsert) from a duplicate ADD of the same member under a fresh uuid (skip). Editing
// membershipStartDate was silently dropped, which #1983 made visible: the roster
// filters on membershipStartDate, so the stale date kept the member off the sheet.

import {assert} from "chai";

jest.mock("../../src/framework/bean/Service", () => () => (target) => target);

import {harness, member} from "./groupSubjectSaveHarness";

describe("GroupSubjectService.saveGroupSubject", () => {
    it("persists an edit to membershipStartDate on an existing membership (same uuid)", () => {
        const existing = [member({uuid: "gs1", start: new Date(2026, 6, 9)})];
        const {service, savedGroupSubjects} = harness(existing);

        const edited = member({uuid: "gs1", start: new Date(2026, 6, 8)});
        service.saveGroupSubject(edited);

        const saved = savedGroupSubjects();
        assert.lengthOf(saved, 1, "the edited membership must be persisted");
        assert.strictEqual(saved[0].obj.membershipStartDate.getDate(), 8);
    });

    it("skips a duplicate add of the same member under a fresh uuid", () => {
        const existing = [member({uuid: "gs1"})];
        const {service, savedGroupSubjects} = harness(existing);

        service.saveGroupSubject(member({uuid: "gs2"}));

        assert.lengthOf(savedGroupSubjects(), 0, "must not create a second membership row");
    });

    it("creates a brand new membership", () => {
        const {service, savedGroupSubjects} = harness([]);

        service.saveGroupSubject(member({uuid: "gs1"}));

        assert.lengthOf(savedGroupSubjects(), 1);
    });

    it("always saves a voided membership (#1772)", () => {
        const existing = [member({uuid: "gs1"})];
        const {service, savedGroupSubjects} = harness(existing);

        service.saveGroupSubject(member({uuid: "gs1", voided: true}));

        assert.lengthOf(savedGroupSubjects(), 1);
    });
});
