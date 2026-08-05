import {assert} from "chai";
import EncounterSelectFormElementHelper from "../../../../src/views/form/formElement/EncounterSelectFormElementHelper";

const completed = {uuid: "completed-uuid"};
const scheduled = {uuid: "scheduled-uuid"};
const cancelled = {uuid: "cancelled-uuid"};
const allEncounters = [completed, scheduled, cancelled];

function uuidsOf(encounters) {
    return encounters.map(({uuid}) => uuid);
}

describe("EncounterSelectFormElementHelper.applicableEncounters", () => {
    it("returns every encounter when no rule filter is set", () => {
        assert.deepEqual(uuidsOf(EncounterSelectFormElementHelper.applicableEncounters(allEncounters, [], [])),
            ["completed-uuid", "scheduled-uuid", "cancelled-uuid"]);
    });

    it("returns only the encounters a showAnswers rule listed", () => {
        assert.deepEqual(uuidsOf(EncounterSelectFormElementHelper.applicableEncounters(allEncounters, ["completed-uuid"], [])),
            ["completed-uuid"]);
    });

    it("drops the encounters a skipAnswers rule listed", () => {
        assert.deepEqual(uuidsOf(EncounterSelectFormElementHelper.applicableEncounters(allEncounters, [], ["scheduled-uuid"])),
            ["completed-uuid", "cancelled-uuid"]);
    });

    it("ignores a uuid that is not among the subject's encounters of this type", () => {
        assert.deepEqual(uuidsOf(EncounterSelectFormElementHelper.applicableEncounters(allEncounters, ["some-other-subjects-encounter"], [])),
            []);
    });

    it("preserves the order the encounters were queried in", () => {
        assert.deepEqual(uuidsOf(EncounterSelectFormElementHelper.applicableEncounters(allEncounters, ["cancelled-uuid", "completed-uuid"], [])),
            ["completed-uuid", "cancelled-uuid"]);
    });

    it("treats a nil filter the same as an empty one", () => {
        assert.deepEqual(uuidsOf(EncounterSelectFormElementHelper.applicableEncounters(allEncounters, undefined, undefined)),
            ["completed-uuid", "scheduled-uuid", "cancelled-uuid"]);
    });
});
