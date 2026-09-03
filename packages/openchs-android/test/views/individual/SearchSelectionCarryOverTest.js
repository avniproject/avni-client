// Picking members across two trips through search: the second result set does not contain the
// first trip's people, so resolving only against it would silently drop them - the Done count
// would say 8 and three would arrive.

import {assert} from "chai";

import resolveSelectedIndividuals from "../../../src/views/individual/resolveSelectedIndividuals";

const hydrate = (item) => ({...item, hydrated: true});
const resolve = (selectedUUIDs, searchResults, carriedIn) =>
    resolveSelectedIndividuals(selectedUUIDs, searchResults, carriedIn, hydrate);

describe("resolveSelectedIndividuals", () => {
    it("keeps people picked on an earlier trip through search", () => {
        const selected = resolve(["a1", "a2", "b1"], [{uuid: "b1"}, {uuid: "b2"}], [{uuid: "a1"}, {uuid: "a2"}]);
        assert.deepEqual(selected.map(s => s.uuid), ["a1", "a2", "b1"]);
    });

    it("hands back one row per tick, so the Done count matches what arrives", () => {
        const selectedUUIDs = ["a1", "a2", "b1"];
        assert.lengthOf(resolve(selectedUUIDs, [{uuid: "b1"}], [{uuid: "a1"}, {uuid: "a2"}]), selectedUUIDs.length);
    });

    it("takes the fresher copy when someone is in both", () => {
        const selected = resolve(["a1"], [{uuid: "a1", name: "fresh"}], [{uuid: "a1", name: "stale"}]);
        assert.strictEqual(selected[0].name, "fresh");
        assert.isTrue(selected[0].hydrated, "a row from the results must be hydrated");
    });

    it("preserves the order the rows were ticked in", () => {
        const selected = resolve(["b1", "a1"], [{uuid: "b1"}], [{uuid: "a1"}]);
        assert.deepEqual(selected.map(s => s.uuid), ["b1", "a1"]);
    });

    it("hands over nothing when nothing is ticked", () => {
        assert.deepEqual(resolve([], [{uuid: "b1"}], []), []);
    });
});
