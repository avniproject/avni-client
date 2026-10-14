// Coverage for the attendance eligibility window (#1983): a student appears on a
// sheet only for dates within their class-membership window
// [membershipStartDate (→ registrationDate fallback), membershipEndDate], inclusive.

import {assert} from "chai";

jest.mock("../../../src/framework/bean/Service", () => () => (target) => target);

import {RosterActions} from "../../../src/action/attendance/RosterActions";

// Local Date construction (year, monthIndex, day) keeps the calendar date stable
// across timezones — new Date("YYYY-MM-DD") would be UTC midnight and can shift.
const d = (y, m, day) => new Date(y, m - 1, day);

function member({start = null, end = null, registration = null, voided = false} = {}) {
    return {
        membershipStartDate: start,
        membershipEndDate: end,
        memberSubject: {uuid: "s1", voided, registrationDate: registration},
    };
}

describe("RosterActions._isEligibleOn — attendance eligibility window", () => {
    it("excludes a student for dates before they joined the class", () => {
        const gs = member({start: d(2026, 5, 10)});
        assert.isFalse(RosterActions._isEligibleOn(gs, "2026-05-09"));
    });

    it("includes a student on/after their membership start (start bound inclusive)", () => {
        const gs = member({start: d(2026, 5, 10)});
        assert.isTrue(RosterActions._isEligibleOn(gs, "2026-05-10"), "boundary == start is inclusive");
        assert.isTrue(RosterActions._isEligibleOn(gs, "2026-05-11"));
    });

    it("includes a since-departed student on past dates within their window", () => {
        const gs = member({start: d(2026, 1, 1), end: d(2026, 5, 31)});
        assert.isTrue(RosterActions._isEligibleOn(gs, "2026-03-15"), "enrolled on this past date");
        assert.isTrue(RosterActions._isEligibleOn(gs, "2026-05-31"), "boundary == end is inclusive");
    });

    it("excludes a departed student for dates after they left", () => {
        const gs = member({start: d(2026, 1, 1), end: d(2026, 5, 31)});
        assert.isFalse(RosterActions._isEligibleOn(gs, "2026-06-01"));
    });

    it("treats a missing membershipEndDate as an open (still-enrolled) window", () => {
        const gs = member({start: d(2026, 1, 1), end: null});
        assert.isTrue(RosterActions._isEligibleOn(gs, "2030-01-01"));
    });

    it("falls back to the member's registrationDate when membershipStartDate is unset", () => {
        const gs = member({start: null, registration: d(2026, 5, 10)});
        assert.isFalse(RosterActions._isEligibleOn(gs, "2026-05-09"), "before registration date");
        assert.isTrue(RosterActions._isEligibleOn(gs, "2026-05-10"), "on registration date");
    });

    it("has no lower bound when neither membership start nor registration date is known", () => {
        const gs = member({start: null, registration: null});
        assert.isTrue(RosterActions._isEligibleOn(gs, "2020-01-01"));
    });
});
