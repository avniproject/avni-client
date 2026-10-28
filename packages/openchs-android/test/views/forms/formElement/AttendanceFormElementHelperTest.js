import {assert} from "chai";
import AttendanceFormElementHelper from "../../../../src/views/form/formElement/AttendanceFormElementHelper";

const member = (nameString) => ({memberSubject: {uuid: nameString, nameString}});
const namesOf = (groupSubjects) => groupSubjects.map(({memberSubject}) => memberSubject.nameString);

describe("AttendanceFormElementHelper.sortByName", () => {
    it("sorts members A to Z, ignoring upper and lower case", () => {
        assert.deepEqual(namesOf(AttendanceFormElementHelper.sortByName([member("Zoya"), member("asha"), member("Ravi")])),
            ["asha", "Ravi", "Zoya"]);
    });
});

describe("AttendanceFormElementHelper.matchingName", () => {
    const groupSubjects = [member("asha"), member("Ravi"), member("Zoya")];

    it("returns every member when the search is empty or blank", () => {
        assert.deepEqual(namesOf(AttendanceFormElementHelper.matchingName(groupSubjects, "")), ["asha", "Ravi", "Zoya"]);
        assert.deepEqual(namesOf(AttendanceFormElementHelper.matchingName(groupSubjects, "  ")), ["asha", "Ravi", "Zoya"]);
    });

    it("keeps members whose name contains the search, ignoring case", () => {
        assert.deepEqual(namesOf(AttendanceFormElementHelper.matchingName(groupSubjects, "ZO")), ["Zoya"]);
        assert.deepEqual(namesOf(AttendanceFormElementHelper.matchingName(groupSubjects, "a")), ["asha", "Ravi", "Zoya"]);
    });

    it("returns nothing when no name matches", () => {
        assert.deepEqual(AttendanceFormElementHelper.matchingName(groupSubjects, "xyz"), []);
    });

    it("treats regex characters in the search as plain text", () => {
        assert.deepEqual(AttendanceFormElementHelper.matchingName(groupSubjects, "a.*"), []);
    });

    it("matches each typed word on its own, in any order", () => {
        const members = [member("Asha Kumari Devi"), member("Asha Patil"), member("Jean-Paul Rao")];
        assert.deepEqual(namesOf(AttendanceFormElementHelper.matchingName(members, "asha devi")), ["Asha Kumari Devi"]);
        assert.deepEqual(namesOf(AttendanceFormElementHelper.matchingName(members, "devi  asha")), ["Asha Kumari Devi"]);
        assert.deepEqual(namesOf(AttendanceFormElementHelper.matchingName(members, "paul-jean")), ["Jean-Paul Rao"]);
        assert.deepEqual(AttendanceFormElementHelper.matchingName(members, "asha xyz"), []);
    });
});
