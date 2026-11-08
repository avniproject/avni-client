// Verifies that DashboardFilterService.getDashboardFilterConfig reads a Subject Type filter's preset
// (presetSubjectTypeUUID, presetProgramUUID) into live entities, and reads no preset when it is missing, deleted or not a Subject Type filter.

import {assert} from "chai";
import {Program, SubjectType} from "openchs-models";

jest.mock("../../../src/framework/bean/Service", () => () => (target) => target);

import DashboardFilterService from "../../../src/service/reports/DashboardFilterService";

const build = (settings, entities) => {
    const service = new DashboardFilterService(null, null);
    const calls = [];
    service.findByUUID = (uuid, schemaName) => {
        calls.push({uuid, schemaName});
        return entities[uuid];
    };
    const config = service.getDashboardFilterConfig({uuid: "f1", name: "Filter", filterConfig: JSON.stringify(settings)});
    return {config, calls};
};
const entity = (uuid, voided = false) => ({uuid, name: uuid, voided});
const subjectTypeSettings = (extra = {}) => ({type: "SubjectType", widget: "Default", ...extra});

describe("DashboardFilterService preset", () => {
    it("reads a preset subject type and program", () => {
        const {config, calls} = build(subjectTypeSettings({presetSubjectTypeUUID: "st-1", presetProgramUUID: "p-1"}),
            {"st-1": entity("st-1"), "p-1": entity("p-1")});
        assert.equal(config.presetSubjectType.uuid, "st-1");
        assert.equal(config.presetProgram.uuid, "p-1");
        assert.isNull(config.subjectType);
        assert.deepInclude(calls, {uuid: "st-1", schemaName: SubjectType.schema.name});
        assert.deepInclude(calls, {uuid: "p-1", schemaName: Program.schema.name});
    });

    it("reads a preset subject type alone", () => {
        const {config} = build(subjectTypeSettings({presetSubjectTypeUUID: "st-1"}), {"st-1": entity("st-1")});
        assert.equal(config.presetSubjectType.uuid, "st-1");
        assert.isNull(config.presetProgram);
    });

    it("treats a preset subject type missing from the phone as no preset, its program too", () => {
        const {config} = build(subjectTypeSettings({presetSubjectTypeUUID: "st-1", presetProgramUUID: "p-1"}), {"p-1": entity("p-1")});
        assert.isNull(config.presetSubjectType);
        assert.isNull(config.presetProgram);
    });

    it("treats a deleted preset subject type as no preset", () => {
        const {config} = build(subjectTypeSettings({presetSubjectTypeUUID: "st-1", presetProgramUUID: "p-1"}),
            {"st-1": entity("st-1", true), "p-1": entity("p-1")});
        assert.isNull(config.presetSubjectType);
        assert.isNull(config.presetProgram);
    });

    it("keeps the subject type when the preset program is missing or deleted", () => {
        const settings = subjectTypeSettings({presetSubjectTypeUUID: "st-1", presetProgramUUID: "p-1"});
        const missing = build(settings, {"st-1": entity("st-1")}).config;
        assert.equal(missing.presetSubjectType.uuid, "st-1");
        assert.isNull(missing.presetProgram);
        const deleted = build(settings, {"st-1": entity("st-1"), "p-1": entity("p-1", true)}).config;
        assert.equal(deleted.presetSubjectType.uuid, "st-1");
        assert.isNull(deleted.presetProgram);
    });

    it("treats a program without a subject type as no preset", () => {
        const {config} = build(subjectTypeSettings({presetProgramUUID: "p-1"}), {"p-1": entity("p-1")});
        assert.isNull(config.presetSubjectType);
        assert.isNull(config.presetProgram);
    });

    it("reads no preset for other filter types", () => {
        const {config} = build({type: "RegistrationDate", widget: "Range", subjectTypeUUID: "st-1", presetSubjectTypeUUID: "st-1", presetProgramUUID: "p-1"},
            {"st-1": entity("st-1"), "p-1": entity("p-1")});
        assert.isNull(config.presetSubjectType);
        assert.isNull(config.presetProgram);
        assert.equal(config.subjectType.uuid, "st-1");
    });

    it("reads no preset when none is set", () => {
        const {config, calls} = build(subjectTypeSettings(), {});
        assert.isNull(config.presetSubjectType);
        assert.isNull(config.presetProgram);
        assert.isEmpty(calls.filter(c => !c.uuid));
        assert.isEmpty(calls);
    });
});
