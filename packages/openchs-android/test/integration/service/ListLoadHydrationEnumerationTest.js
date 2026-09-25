/**
 * Every branch of MyDashboardActions.onListLoad opens this one screen. Each must declare what it
 * loads; none may fall through to the deep default. This test exists because the branches were
 * converted one at a time across four review rounds, and the list was never closed.
 *
 * Adding a listType to onListLoad without adding it here fails this test. That is the point.
 *
 * Tracking issue: avniproject/avni-client#2105.
 *   npx jest --selectProjects integration --testPathPattern ListLoadHydrationEnumerationTest
 */
import {assert} from "chai";
import fs from "fs";
import path from "path";

jest.mock("../../../src/framework/bean/Service", () => () => (target) => target);

import IndividualService from "../../../src/service/IndividualService";

// One row per listType in MyDashboardActions.onListLoad. `shallow` means the method must route its
// query through forListDisplay; `eager` means it legitimately reads lists and says why.
const BRANCHES = [
    {listType: "scheduled", method: "allScheduledVisitsIn", expectation: "shallow"},
    {listType: "overdue", method: "allOverdueVisitsIn", expectation: "shallow"},
    {listType: "recentlyCompletedVisits", method: "recentlyCompletedVisitsIn", expectation: "shallow"},
    {listType: "recentlyCompletedRegistration", method: "recentlyRegistered", expectation: "shallow"},
    {listType: "total", method: "allIn", expectation: "shallow"},
    {listType: "recentlyCompletedEnrolment", method: "recentlyEnrolled", expectation: "shallow"},
    {listType: "dueChecklist", method: "dueChecklists", expectation: "eager",
        // A plain shallow shape would defer exactly the lists it then reads, adding a query per
        // checklist. The deep default does also load visit history it never reads; a tailored shape
        // is possible but unmeasured, and the card exists only where a 'Child' program has checklists.
        reason: "walks enrolment.checklists -> checklist.items -> calculateApplicableState() on every row"}
];

// Read as text: importing the action module would pull in the app's view layer.
function onListLoadSource() {
    const file = path.join(__dirname, "../../../src/action/mydashboard/MyDashboardActions.js");
    const source = fs.readFileSync(file, "utf8");
    const start = source.indexOf("static onListLoad(");
    const end = source.indexOf("\n    static ", start + 1);
    assert.isAbove(start, -1, "MyDashboardActions.onListLoad not found");
    return source.slice(start, end);
}

describe("onListLoad branches all declare what they load (#2105)", () => {

    // Matched by how onListLoad dispatches, not by what the branches happen to be called, so a new
    // branch in any of the three existing shapes is caught whatever its name.
    it("covers every listType onListLoad can be called with", () => {
        const source = onListLoadSource();
        const quoted = /["'`](\w+)["'`]/g;
        const listTypesInSource = [
            ...[...source.matchAll(/listType\s*===\s*["'`](\w+)["'`]/g)].map(match => match[1]),
            ...[...source.matchAll(/\[\s*["'`](\w+)["'`]\s*,\s*individualService\./g)].map(match => match[1]),
            ...[...source.matchAll(/\[([^\]]*)\]\.includes\(listType\)/g)]
                .flatMap(match => [...match[1].matchAll(quoted)].map(inner => inner[1]))
        ];
        assert.isNotEmpty(listTypesInSource, "no listType dispatch found — onListLoad changed shape; update this test");

        const uncovered = [...new Set(listTypesInSource)].filter(
            listType => !BRANCHES.some(branch => branch.listType === listType));

        assert.deepEqual(uncovered, [],
            `onListLoad handles a listType this test does not: ${uncovered.join(", ")}. ` +
            `Add it to BRANCHES and to the enumeration in avni-product-ops 2105-review-ledger.md.`);
    });

    it("names a real IndividualService method for every branch", () => {
        const missing = BRANCHES.filter(branch => typeof IndividualService.prototype[branch.method] !== "function");

        assert.deepEqual(missing.map(branch => branch.method), []);
    });

    it("routes every shallow branch through forListDisplay", () => {
        const notRouted = BRANCHES
            .filter(branch => branch.expectation === "shallow")
            .filter(branch => !IndividualService.prototype[branch.method].toString().includes("forListDisplay"));

        assert.deepEqual(notRouted.map(branch => branch.method), [],
            `These onListLoad branches still fall through to the deep default: ` +
            `${notRouted.map(branch => branch.method).join(", ")}`);
    });

    it("requires a written reason for every eager branch", () => {
        const unexplained = BRANCHES.filter(branch => branch.expectation === "eager" && !branch.reason);

        assert.deepEqual(unexplained.map(branch => branch.listType), []);
    });

    // Realm collections have no withHydration. The old engine must get back exactly what it asked
    // for, or its numbers move — and the card requires them unchanged.
    it("hands a Realm collection back untouched", () => {
        const realmLike = {filtered: () => realmLike, sorted: () => realmLike};
        const service = new IndividualService({}, {
            getRepositoryFactory: () => ({getRepository: () => ({getAllNonVoided: () => realmLike})})
        });

        assert.strictEqual(service.allIn(new Date(), [], ""), realmLike);
    });
});
