// Reducer-level coverage for the per-student "Other" free-text reason.
// The free-text box is driven by the attendance-type config's otherReasonConcept; the text
// is cleared whenever that reason is not selected (deselect, mark-present, mark-all-present).

import {assert} from "chai";

jest.mock("../../../src/framework/bean/Service", () => () => (target) => target);

import {AttendanceRecord} from "avni-models";
import {RosterActions} from "../../../src/action/attendance/RosterActions";

// "other" is the configured Other reason (config.otherReasonConcept); "sick" is an ordinary answer.
function baseState() {
    return {
        otherReasonConceptUUID: "other",
        absenceReasonAnswers: [
            {uuid: "sick", name: "Sick"},
            {uuid: "other", name: "Other"},
        ],
        roster: [
            {subjectUUID: "s1", status: AttendanceRecord.status.ABSENT, reasonConceptUUIDs: [], otherReasonText: "", needsFollowUp: false},
            {subjectUUID: "s2", status: AttendanceRecord.status.ABSENT, reasonConceptUUIDs: [], otherReasonText: "", needsFollowUp: false},
        ],
    };
}

describe("RosterActions — Other free-text reason", () => {
    it("onSetOtherReasonText sets the text only on the targeted row", () => {
        const next = RosterActions.onSetOtherReasonText(baseState(), {subjectUUID: "s1", text: "family wedding"});
        const byId = Object.fromEntries(next.roster.map(r => [r.subjectUUID, r]));
        assert.equal(byId["s1"].otherReasonText, "family wedding");
        assert.equal(byId["s2"].otherReasonText, "", "untargeted row untouched");
    });

    it("deselecting the Text reason clears the entered text", () => {
        let state = RosterActions.onToggleReason(baseState(), {subjectUUID: "s1", reasonConceptUUID: "other"});
        state = RosterActions.onSetOtherReasonText(state, {subjectUUID: "s1", text: "shifted city"});
        assert.equal(state.roster[0].otherReasonText, "shifted city");
        // Toggle "other" off — text must clear.
        state = RosterActions.onToggleReason(state, {subjectUUID: "s1", reasonConceptUUID: "other"});
        assert.deepEqual(state.roster[0].reasonConceptUUIDs, []);
        assert.equal(state.roster[0].otherReasonText, "");
    });

    it("keeps the text while the Text reason stays selected alongside other reasons", () => {
        let state = RosterActions.onToggleReason(baseState(), {subjectUUID: "s1", reasonConceptUUID: "other"});
        state = RosterActions.onSetOtherReasonText(state, {subjectUUID: "s1", text: "monsoon flooding"});
        // Add a second, coded reason — "other" is still selected, so text survives.
        state = RosterActions.onToggleReason(state, {subjectUUID: "s1", reasonConceptUUID: "sick"});
        assert.equal(state.roster[0].otherReasonText, "monsoon flooding");
        // Remove only the coded reason — "other" remains, text still survives.
        state = RosterActions.onToggleReason(state, {subjectUUID: "s1", reasonConceptUUID: "sick"});
        assert.equal(state.roster[0].otherReasonText, "monsoon flooding");
    });

    it("toggling the student to PRESENT clears the Other text", () => {
        let state = RosterActions.onToggleReason(baseState(), {subjectUUID: "s1", reasonConceptUUID: "other"});
        state = RosterActions.onSetOtherReasonText(state, {subjectUUID: "s1", text: "family emergency"});
        state = RosterActions.onTogglePresence(state, {subjectUUID: "s1"});
        assert.equal(state.roster[0].status, AttendanceRecord.status.PRESENT);
        assert.equal(state.roster[0].otherReasonText, "");
    });

    it("onMarkAllPresent clears Other text across the roster", () => {
        let state = RosterActions.onToggleReason(baseState(), {subjectUUID: "s1", reasonConceptUUID: "other"});
        state = RosterActions.onSetOtherReasonText(state, {subjectUUID: "s1", text: "away"});
        state = RosterActions.onMarkAllPresent(state);
        state.roster.forEach(r => assert.equal(r.otherReasonText, ""));
    });

    it("never retains Other text when the attendance type has no configured Other reason", () => {
        const noConfig = {...baseState(), otherReasonConceptUUID: null};
        let state = RosterActions.onToggleReason(noConfig, {subjectUUID: "s1", reasonConceptUUID: "other"});
        state = RosterActions.onSetOtherReasonText(state, {subjectUUID: "s1", text: "should not stick"});
        // Re-running the reason toggle recomputes otherReasonText against the (absent) config → cleared.
        state = RosterActions.onToggleReason(state, {subjectUUID: "s1", reasonConceptUUID: "sick"});
        assert.equal(state.roster[0].otherReasonText, "");
    });
});
