import {assert} from "chai";
const stubClass = () => ({__esModule: true, default: class {}});
jest.mock("../../../src/utility/CHSNavigator", () => ({__esModule: true, default: {}}));
jest.mock("../../../src/views/common/Observations", () => () => null);
jest.mock("../../../src/encounter/CompletedEncountersView", () => () => null);
jest.mock("../../../src/views/common/CollapsibleEncounter", () => () => null);
jest.mock("../../../src/views/common/FormShareActionSheet", () => () => null);
jest.mock("../../../src/views/common/ObservationsSectionOptions", () => () => null);
jest.mock("../../../src/framework/routing/TypedTransition", () => ({__esModule: true, default: {}}));
jest.mock("../../../src/service/FormMappingService", () => ({__esModule: true, default: class {}}));
jest.mock("../../../src/service/EncounterService", () => ({__esModule: true, default: class {}}));
jest.mock("../../../src/service/PrivilegeService", () => ({__esModule: true, default: class {}}));
jest.mock("../../../src/service/UserInfoService", () => ({__esModule: true, default: class {}}));
jest.mock("../../../src/service/FormPDFService", () => ({__esModule: true, default: class {}}));
jest.mock("../../../src/service/FormShareService", () => ({__esModule: true, default: class {}}));
import React from "react";
import _ from "lodash";
import PreviousEncounters from "../../../src/views/common/PreviousEncounters";
import ObservationsSectionOptions from "../../../src/views/common/ObservationsSectionOptions";

const findOptions = (element) => {
    if (!element || typeof element !== 'object') return null;
    if (element.type === ObservationsSectionOptions) return element.props;
    return _.reduce(React.Children.toArray(element.props && element.props.children), (found, child) => found || findOptions(child), null);
};

const view = (props = {}) => {
    const v = Object.create(PreviousEncounters.prototype);
    v.props = {allowedEncounterTypeUuidsForPerformVisit: [], allowedEncounterTypeUuidsForCancelVisit: [], ...props};
    v.privilegeService = {hasAllPrivileges: () => true};
    v.context = {getService: () => ({findFormForEncounterType: () => null, isEncounterTypeCancellable: () => true})};
    Object.defineProperty(v, 'I18n', {value: {t: (k) => k}});
    v.renderTitleAndDetails = () => null;
    v.badge = () => null;
    return v;
};

const encounter = ({done = false, cancelled = false} = {}) => ({
    uuid: 'e1', encounterType: {uuid: 'et1'}, getObservations: () => [],
    encounterDateTime: done ? new Date() : null, cancelDateTime: cancelled ? new Date() : null,
    isScheduled() { return _.isNil(this.encounterDateTime) && _.isNil(this.cancelDateTime); },
});

describe('PreviousEncounters.renderNormalView actions (#2161)', () => {
    it('offers Do and Cancel on a planned visit', () => {
        const options = findOptions(view().renderNormalView(encounter()));
        assert.deepEqual(_.map(options.contextActions, 'labelKey'), ['do']);
        assert.isDefined(options.primaryAction);
    });

    it('offers neither Do nor Cancel on a visit that is already done', () => {
        const options = findOptions(view().renderNormalView(encounter({done: true})));
        assert.isEmpty(options.contextActions);
        assert.isUndefined(options.primaryAction);
    });

    it('offers neither Do nor Cancel on a cancelled visit', () => {
        const options = findOptions(view().renderNormalView(encounter({cancelled: true})));
        assert.isEmpty(options.contextActions);
        assert.isUndefined(options.primaryAction);
    });

    it('keeps Delete and Do on a draft, whatever its dates', () => {
        const options = findOptions(view({containsDrafts: true}).renderNormalView(encounter({done: true})));
        assert.deepEqual(_.map(options.contextActions, 'labelKey'), ['delete', 'do']);
    });
});
