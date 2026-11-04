jest.mock("../../src/utility/bugsnag", () => ({__esModule: true, default: {notify: jest.fn()}}));
import {WorkItem, WorkList, WorkLists} from "avni-models";
import AbstractDataEntryState from "../../src/state/AbstractDataEntryState";
import {returnsToSource} from "../../src/utility/ReturnToSource";

const listsWith = (parameters) =>
    new WorkLists(new WorkList('w', [new WorkItem('1', WorkItem.type.REGISTRATION, parameters), new WorkItem('2', WorkItem.type.REGISTRATION, {})]));

const stateFor = () => {
    const state = Object.create(AbstractDataEntryState.prototype);
    state.getEntity = () => ({});
    state.getEntityType = () => 'Individual';
    return state;
};
const context = {get: () => ({findByKey: () => ({isHousehold: () => false})})};

describe("updateWorkLists keeps returnToSource", () => {
    it("when a rule returns brand-new work lists", () => {
        const ruleService = {updateWorkLists: () => listsWith({})};
        const result = stateFor().updateWorkLists(ruleService, listsWith({returnToSource: true}), [], context);
        expect(returnsToSource(result)).toBe(true);
    });
    it("adds no flag when the old item had none", () => {
        const ruleService = {updateWorkLists: () => listsWith({})};
        const result = stateFor().updateWorkLists(ruleService, listsWith({}), [], context);
        expect(returnsToSource(result)).toBe(false);
    });
    it("when a rule returns the lists it was given", () => {
        const ruleService = {updateWorkLists: (lists) => lists};
        const result = stateFor().updateWorkLists(ruleService, listsWith({returnToSource: true}), [], context);
        expect(returnsToSource(result)).toBe(true);
    });
});
