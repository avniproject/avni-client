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
    "encounter/CompletedEncountersView.js",
    "views/individuallist/IndividualList.js",
    "views/individual/SubjectDashboardGeneralTab.js",
    "views/individual/SubjectDashboardProfileTab.js",
    "views/program/SubjectDashboardProgramsTab.js",
    "views/program/SubjectDashboardView.js",
];

const read = (rel) => fs.readFileSync(path.join(SRC, rel), "utf8");

// Every .js under src/views and src/encounter, so a NEW screen cannot quietly opt out of the invariant
// by simply not being added to the list above.
const allScreenFiles = () => {
    const out = [];
    const walk = (dir) => {
        fs.readdirSync(dir, {withFileTypes: true}).forEach((e) => {
            const full = path.join(dir, e.name);
            if (e.isDirectory()) walk(full);
            else if (e.name.endsWith(".js")) out.push(path.relative(SRC, full));
        });
    };
    ["views", "encounter"].forEach((d) => walk(path.join(SRC, d)));
    return out;
};

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

    // The audit that found the shipped defects, kept as a test rather than a one-off. A screen defining
    // its own render() bypasses AbstractComponent.render(), which is what holds the loader in place —
    // so it would paint a half-built form during the slide. This catches it wherever it appears, not
    // only in the curated list above.
    it("no screen anywhere defines both loadData() and render()", () => {
        const offenders = allScreenFiles().filter((rel) => {
            const src = read(rel);
            return /\n {4}loadData\(\) \{/.test(src) && /\n {4}render\(\) \{/.test(src);
        });
        expect(offenders).toEqual([]);
    });

    it("every screen on the contract list exists", () => {
        const missing = DEFERRED_LOAD_SCREENS.filter((rel) => !fs.existsSync(path.join(SRC, rel)));
        expect(missing).toEqual([]);
    });

    // Not "no screen may register twice" — SubjectDashboardProgramsTab legitimately does, registering
    // loadData() through the base class and dispatchOnLoad() from onViewDidMount. Registration state is
    // per-call so both run; this records that the multi-registration case is real and supported.
    it("a screen may register the transition trigger more than once", () => {
        const src = read("views/program/SubjectDashboardProgramsTab.js");
        expect(/\n {4}loadData\(\) \{/.test(src)).toBe(true);
        expect(src).toMatch(/this\.runAfterSceneTransition\(/);
    });
});
