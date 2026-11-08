import {CustomFilter, DashboardFilterConfig} from "openchs-models";
import {assert} from "chai";

function subjectTypeFilter({presetSubjectType, presetProgram}) {
    const config = new DashboardFilterConfig();
    config.type = CustomFilter.type.SubjectType;
    config.presetSubjectType = presetSubjectType;
    config.presetProgram = presetProgram;
    return config;
}

describe("DashboardFilterConfig preset", () => {
    it("copies the preset subject type and program when cloned", () => {
        const config = subjectTypeFilter({presetSubjectType: {uuid: "st-1"}, presetProgram: {uuid: "p-1"}});

        const clone = config.clone();

        assert.equal(clone.presetSubjectType.uuid, "st-1");
        assert.equal(clone.presetProgram.uuid, "p-1");
    });

    it("is not valid with a preset program and no preset subject type", () => {
        assert.isFalse(subjectTypeFilter({presetSubjectType: null, presetProgram: {uuid: "p-1"}}).isValid());
        assert.isTrue(subjectTypeFilter({presetSubjectType: {uuid: "st-1"}, presetProgram: {uuid: "p-1"}}).isValid());
    });
});
