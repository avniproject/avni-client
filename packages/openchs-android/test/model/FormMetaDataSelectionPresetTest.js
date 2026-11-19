import {assert} from "chai";
import FormMetaDataSelection from "../../src/model/FormMetaDataSelection";

const st1 = {uuid: "st-1", name: "Household"};
const st2 = {uuid: "st-2", name: "Person"};
const p1 = {uuid: "p-1", name: "Child"};
const p2 = {uuid: "p-2", name: "Adult"};
const e1 = {uuid: "e-1", name: "Visit"};
const e2 = {uuid: "e-2", name: "Follow up"};
const sel = (subjectTypes = [], programs = [], encounterTypes = []) => new FormMetaDataSelection(subjectTypes, programs, encounterTypes);
const uuids = (list) => list.map((x) => x.uuid);

describe("FormMetaDataSelection.forPreset", () => {
    it("is an empty selection without a preset", () => {
        const s = FormMetaDataSelection.forPreset(null, null);
        assert.isTrue(s.isEmpty());
    });

    it("holds the preset subject type alone", () => {
        const s = FormMetaDataSelection.forPreset(st1, null);
        assert.deepEqual(uuids(s.subjectTypes), ["st-1"]);
        assert.deepEqual(s.programs, []);
        assert.deepEqual(s.encounterTypes, []);
    });

    it("holds the preset subject type and program", () => {
        const s = FormMetaDataSelection.forPreset(st1, p1);
        assert.deepEqual(uuids(s.subjectTypes), ["st-1"]);
        assert.deepEqual(uuids(s.programs), ["p-1"]);
        assert.deepEqual(s.encounterTypes, []);
    });
});

describe("FormMetaDataSelection.isPreset", () => {
    it("is true for the seed, with and without a program", () => {
        assert.isTrue(sel([st1]).isPreset(st1, null));
        assert.isTrue(sel([st1], [p1]).isPreset(st1, p1));
    });

    it("is false once a program or an encounter type is added", () => {
        assert.isFalse(sel([st1], [p1]).isPreset(st1, null));
        assert.isFalse(sel([st1], [], [e1]).isPreset(st1, null));
        assert.isFalse(sel([st1], [p1], [e1]).isPreset(st1, p1));
    });

    it("is false when the program is missing or different", () => {
        assert.isFalse(sel([st1]).isPreset(st1, p1));
        assert.isFalse(sel([st1], [p2]).isPreset(st1, p1));
    });

    it("is false for another or an extra subject type", () => {
        assert.isFalse(sel([st2]).isPreset(st1, null));
        assert.isFalse(sel([st1, st2]).isPreset(st1, null));
    });

    it("is false with no preset", () => {
        assert.isFalse(sel().isPreset(null, null));
        assert.isFalse(sel([st1]).isPreset(null, null));
    });
});

describe("FormMetaDataSelection.agreesWithPreset", () => {
    it("is true with extra encounter types", () => {
        assert.isTrue(sel([st1], [], [e1, e2]).agreesWithPreset(st1, null));
        assert.isTrue(sel([st1], [p1], [e1]).agreesWithPreset(st1, p1));
    });

    it("is false for another subject type, two, or none", () => {
        assert.isFalse(sel([st2]).agreesWithPreset(st1, null));
        assert.isFalse(sel([st1, st2]).agreesWithPreset(st1, null));
        assert.isFalse(sel().agreesWithPreset(st1, null));
    });

    it("is false for a missing or different program when the preset has one", () => {
        assert.isFalse(sel([st1]).agreesWithPreset(st1, p1));
        assert.isFalse(sel([st1], [p2]).agreesWithPreset(st1, p1));
        assert.isFalse(sel([st1], [p1, p2]).agreesWithPreset(st1, p1));
    });

    it("is true for anything with no preset", () => {
        assert.isTrue(sel().agreesWithPreset(null, null));
        assert.isTrue(sel([st2], [p2], [e1]).agreesWithPreset(null, null));
    });

    it("does not look at programs when the preset has none", () => {
        assert.isTrue(sel([st1], [p2]).agreesWithPreset(st1, null));
    });
});

describe("FormMetaDataSelection.sameAs", () => {
    it("is true for the same uuids in another order", () => {
        assert.isTrue(sel([st1, st2], [p1, p2], [e1, e2]).sameAs(sel([st2, st1], [p2, p1], [e2, e1])));
    });

    it("is false for one extra encounter type", () => {
        assert.isFalse(sel([st1], [p1], [e1]).sameAs(sel([st1], [p1], [e1, e2])));
    });

    it("is false for a different subject type or program", () => {
        assert.isFalse(sel([st1]).sameAs(sel([st2])));
        assert.isFalse(sel([st1], [p1]).sameAs(sel([st1], [p2])));
    });
});
