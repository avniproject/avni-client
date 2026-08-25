import fs from "fs";
import path from "path";

// Source-level guard, deliberately: importing these screens pulls in native modules jest cannot
// construct, and the property being guarded is structural anyway.
//
// AbstractComponent.render() is what holds the loader in place until loadData() has run. A screen that
// defines its own render() silently bypasses that gate and paints a half-built form during the
// navigation slide — the avni-client#2054 defect. These screens all carry heavy per-item rule work on
// entry (measured 1.4–1.8s per rule on JSCS data), so the gate has to stay.
//
// If you are here because this failed: you added render() to one of these, or put entry work back in
// componentWillMount. Rename render() to renderLoaded() and move the entry work into loadData().
const SRC = path.resolve(__dirname, "../../../src");

const DEFERRED_LOAD_SCREENS = [
    "views/individual/PersonRegisterView.js",
    "views/individual/PersonRegisterFormView.js",
    "views/subject/SubjectRegisterView.js",
    "views/program/ProgramEnrolmentView.js",
    "views/program/NewVisitMenuView.js",
    "views/program/ProgramEncounterView.js",
    "views/individual/IndividualEncounterView.js",
];

const read = (rel) => fs.readFileSync(path.join(SRC, rel), "utf8");

describe("deferred-load contract", () => {
    DEFERRED_LOAD_SCREENS.forEach((rel) => {
        const name = path.basename(rel, ".js");

        it(`${name} defines loadData(), so entry work waits for the scene transition`, () => {
            expect(read(rel)).toMatch(/\n {4}loadData\(\) \{/);
        });

        it(`${name} defines renderLoaded(), not render() — the loader gate must apply`, () => {
            const src = read(rel);
            expect(src).toMatch(/\n {4}renderLoaded\(\) \{/);
            expect(src).not.toMatch(/\n {4}render\(\) \{/);
        });

        it(`${name} does no entry work in componentWillMount`, () => {
            expect(read(rel)).not.toMatch(/componentWillMount\(\) \{/);
        });
    });
});
