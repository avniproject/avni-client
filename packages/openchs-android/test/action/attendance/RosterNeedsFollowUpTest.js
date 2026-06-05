// Reducer-level coverage for the needsFollowUp flag introduced for #1003.
// Verifies state transitions only; the save-composition wiring is covered in
// AttendanceSaveCompositionTest.js.

import {assert} from "chai";

jest.mock("../../../src/framework/bean/Service", () => () => (target) => target);

import {AttendanceRecord} from "avni-models";
import {RosterActions} from "../../../src/action/attendance/RosterActions";

function baseState() {
    return {
        roster: [
            {subjectUUID: "s1", name: "Aarav", status: AttendanceRecord.status.PRESENT, reasonConceptUUIDs: [], needsFollowUp: false},
            {subjectUUID: "s2", name: "Esha", status: AttendanceRecord.status.ABSENT, reasonConceptUUIDs: [], needsFollowUp: false},
        ],
    };
}

describe("RosterActions — needsFollowUp reducers", () => {
    it("onToggleNeedsFollowUp flips only the targeted row", () => {
        const next = RosterActions.onToggleNeedsFollowUp(baseState(), {subjectUUID: "s2"});
        const byId = Object.fromEntries(next.roster.map(r => [r.subjectUUID, r]));
        assert.equal(byId["s1"].needsFollowUp, false, "untargeted row untouched");
        assert.equal(byId["s2"].needsFollowUp, true);
    });

    it("onToggleNeedsFollowUp toggles back to false on second call", () => {
        let state = RosterActions.onToggleNeedsFollowUp(baseState(), {subjectUUID: "s2"});
        state = RosterActions.onToggleNeedsFollowUp(state, {subjectUUID: "s2"});
        const byId = Object.fromEntries(state.roster.map(r => [r.subjectUUID, r]));
        assert.equal(byId["s2"].needsFollowUp, false);
    });

    it("onTogglePresence flipping a row to PRESENT clears its needsFollowUp", () => {
        // Start with s2 Absent + needsFollowUp=true; toggling to PRESENT must clear the flag.
        const state = {
            roster: [
                {subjectUUID: "s2", name: "Esha", status: AttendanceRecord.status.ABSENT, reasonConceptUUIDs: ["sick"], needsFollowUp: true},
            ],
        };
        const next = RosterActions.onTogglePresence(state, {subjectUUID: "s2"});
        assert.equal(next.roster[0].status, AttendanceRecord.status.PRESENT);
        assert.equal(next.roster[0].needsFollowUp, false);
        assert.deepEqual(next.roster[0].reasonConceptUUIDs, [], "existing reason-clear contract preserved");
    });

    it("onTogglePresence flipping PRESENT → ABSENT leaves needsFollowUp at default (false)", () => {
        const state = baseState(); // s1 is PRESENT with needsFollowUp=false
        const next = RosterActions.onTogglePresence(state, {subjectUUID: "s1"});
        const s1 = next.roster.find(r => r.subjectUUID === "s1");
        assert.equal(s1.status, AttendanceRecord.status.ABSENT);
        assert.equal(s1.needsFollowUp, false, "absent rows start unchecked; user opts in explicitly");
    });

    it("onMarkAllPresent clears needsFollowUp across the roster", () => {
        const state = {
            roster: [
                {subjectUUID: "s1", status: AttendanceRecord.status.ABSENT, reasonConceptUUIDs: [], needsFollowUp: true},
                {subjectUUID: "s2", status: AttendanceRecord.status.ABSENT, reasonConceptUUIDs: ["sick"], needsFollowUp: true},
            ],
        };
        const next = RosterActions.onMarkAllPresent(state);
        next.roster.forEach(r => {
            assert.equal(r.status, AttendanceRecord.status.PRESENT);
            assert.equal(r.needsFollowUp, false);
        });
    });
});

describe("RosterActions — onToggleReason (multi-select)", () => {
    function absentState() {
        return {
            roster: [
                {subjectUUID: "s1", status: AttendanceRecord.status.ABSENT, reasonConceptUUIDs: [], needsFollowUp: false},
                {subjectUUID: "s2", status: AttendanceRecord.status.ABSENT, reasonConceptUUIDs: [], needsFollowUp: false},
            ],
        };
    }

    it("adds a reason on first tap and only on the targeted row", () => {
        const next = RosterActions.onToggleReason(absentState(), {subjectUUID: "s1", reasonConceptUUID: "unwell"});
        const byId = Object.fromEntries(next.roster.map(r => [r.subjectUUID, r]));
        assert.deepEqual(byId["s1"].reasonConceptUUIDs, ["unwell"]);
        assert.deepEqual(byId["s2"].reasonConceptUUIDs, [], "untargeted row untouched");
    });

    it("removes a reason on second tap (toggle off)", () => {
        let state = RosterActions.onToggleReason(absentState(), {subjectUUID: "s1", reasonConceptUUID: "unwell"});
        state = RosterActions.onToggleReason(state, {subjectUUID: "s1", reasonConceptUUID: "unwell"});
        assert.deepEqual(state.roster[0].reasonConceptUUIDs, []);
    });

    it("select-all-then-deselect-some keeps only the remaining reasons", () => {
        let state = absentState();
        ["native-place", "unwell", "shifted-home"].forEach(uuid =>
            state = RosterActions.onToggleReason(state, {subjectUUID: "s1", reasonConceptUUID: uuid}));
        // Remove two, leaving one.
        state = RosterActions.onToggleReason(state, {subjectUUID: "s1", reasonConceptUUID: "native-place"});
        state = RosterActions.onToggleReason(state, {subjectUUID: "s1", reasonConceptUUID: "shifted-home"});
        assert.deepEqual(state.roster[0].reasonConceptUUIDs, ["unwell"]);
    });
});
