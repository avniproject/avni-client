import React from "react";
import {Text} from "react-native";
import TestRenderer, {act} from "react-test-renderer";

jest.mock("../../../src/framework/bean/Service", () => () => (target) => target);
jest.doMock("../../../src/views/approval/ApprovalDetailsCard", () => ({
    __esModule: true,
    default: ({approvableEntity}) => require("react").createElement(require("react-native").Text, {testID: `record:${approvableEntity.uuid}`}, approvableEntity.uuid),
}));
jest.doMock("../../../src/views/common/AppHeader", () => ({__esModule: true, default: () => null}));
jest.doMock("../../../src/views/common/CHSContainer", () => ({__esModule: true, default: ({children}) => children}));
jest.doMock("react-native-dropdown-picker", () => ({
    __esModule: true,
    default: () => require("react").createElement(require("react-native").Text, {testID: "form-type-picker"}, "picker"),
}));
jest.doMock("react-native-vector-icons/FontAwesome", () => ({__esModule: true, default: () => null}));

const ApprovalListingView = require("../../../src/views/approval/ApprovalListingView").default;
const {listRows} = require("../../../src/views/approval/ApprovalListingView");
const SubjectApprovalView = require("../../../src/views/approval/SubjectApprovalView").default;
const {noRecordMessageKey} = require("../../../src/views/approval/SubjectApprovalView");
const ServiceContext = require("../../../src/framework/context/ServiceContext").default;
const ReportCardService = require("../../../src/service/customDashboard/ReportCardService").default;
const EntityService = require("../../../src/service/EntityService").default;
const {Individual} = require("openchs-models");

// A subject whose records in each state are given, as getMemberEntitiesWithLatestStatus would return them.
function subject(uuid, name, recordsByState = {}) {
    const individual = Individual.createEmptyInstance();
    individual.uuid = uuid;
    individual.firstName = name;
    individual.getMemberEntitiesWithLatestStatus = (state) => recordsByState[state] || [];
    return individual;
}

function buildContext({reportCard, customResults = [], standardResults = []}) {
    const services = {
        getPlainUUIDFromCompositeReportCardUUID: (x) => x.split("#")[0],
        getResultForCustomApprovalCard: jest.fn(() => customResults),
        getResultForApprovalCardsType: jest.fn(() => standardResults),
    };
    const byClass = new Map([
        [ReportCardService.name, services],
        [EntityService.name, {findByUUID: () => reportCard}],
    ]);
    return {
        services,
        context: {
            getService: (klass) => byClass.get(klass && klass.name) || {getI18n: () => ({t: (key) => key})},
            getStore: () => ({getState: () => ({}), subscribe: () => () => {}, dispatch: () => {}}),
        },
    };
}

const customCard = {isStandardReportType: () => false, standardReportCardType: null};

function drawList(context, results, reportCardUUID = "rc1#0") {
    let renderer;
    act(() => {
        renderer = TestRenderer.create(
            <ServiceContext.Provider value={context}>
                <ApprovalListingView results={results} onApprovalSelection={() => {}} headerTitle="My approvals"
                                     backFunction={() => {}} reportCardUUID={reportCardUUID}
                                     approvalStatus_status="Pending" reportFilters={[{f: 1}]}/>
            </ServiceContext.Provider>);
    });
    return renderer;
}

const texts = (renderer) => renderer.root.findAllByType(Text).map((t) => [].concat(t.props.children).join("")).filter((t) => t !== "");
const byTestID = (renderer, id) => renderer.root.findAll((node) => node.props.testID === id && typeof node.type === "string");

describe("ApprovalListingView on a custom query card", () => {
    it("lists a plain array of subjects with each one's records waiting for a decision", () => {
        const {context} = buildContext({reportCard: customCard});
        const results = [
            subject("s1", "Asha", {Pending: [{uuid: "enc-1"}, {uuid: "enc-2"}]}),
            subject("s2", "Bina", {Pending: [{uuid: "enc-3"}]}),
        ];

        const renderer = drawList(context, results);

        expect(texts(renderer)).toEqual(expect.arrayContaining(["Total 2 subjects", "Asha", "Bina", "enc-1", "enc-2", "enc-3"]));
    });

    it("does not show the form-type list", () => {
        const {context} = buildContext({reportCard: customCard});

        expect(byTestID(drawList(context, []), "form-type-picker")).toHaveLength(0);
    });

    it("shows the form-type list on a standard approval card", () => {
        const {context} = buildContext({reportCard: {isStandardReportType: () => true, standardReportCardType: {}}});
        const renderer = drawList(context, {realmCollection: []});

        expect(byTestID(renderer, "form-type-picker")).toHaveLength(1);
    });

    it("runs the card's own query again on coming back, for the card the list was opened from", () => {
        jest.useFakeTimers();
        const card = {...customCard};
        const {context, services} = buildContext({reportCard: card, customResults: [subject("s2", "Bina", {Pending: [{uuid: "enc-3"}]})]});
        const renderer = drawList(context, [subject("s1", "Asha", {Pending: [{uuid: "enc-1"}]})], "rc1#1");
        const view = renderer.root.findByType(ApprovalListingView).instance;

        act(() => view.didFocus());
        act(() => view.didFocus());
        act(() => jest.runAllTimers());

        expect(services.getResultForCustomApprovalCard).toHaveBeenCalledTimes(1);
        expect(services.getResultForCustomApprovalCard).toHaveBeenCalledWith(card, [{f: 1}]);
        expect(card.itemKey).toBe("rc1#1");
        expect(services.getResultForApprovalCardsType).not.toHaveBeenCalled();
        expect(texts(renderer)).toEqual(expect.arrayContaining(["Total 1 subjects", "Bina", "enc-3"]));
        expect(texts(renderer)).not.toContain("Asha");
        jest.useRealTimers();
    });
});

describe("listRows", () => {
    it("takes a plain array as it is and a database collection's underlying rows", () => {
        const array = [1, 2];
        const collection = [3];

        expect(listRows(array)).toBe(array);
        expect(listRows({realmCollection: collection})).toBe(collection);
    });
});

describe("SubjectApprovalView", () => {
    function drawRow(individual, state) {
        const {context} = buildContext({reportCard: customCard});
        let renderer;
        act(() => {
            renderer = TestRenderer.create(
                <ServiceContext.Provider value={context}>
                    <SubjectApprovalView subject={individual} approvalStatus_status={state} onApprovalSelection={() => {}}/>
                </ServiceContext.Provider>);
        });
        return renderer;
    }

    it.each([
        ["Pending", "noRecordPendingApproval"],
        ["Approved", "noRecordApproved"],
        ["Rejected", "noRecordRejected"],
    ])("says so under a subject with nothing %s", (state, key) => {
        expect(texts(drawRow(subject("s1", "Asha"), state))).toEqual(["Asha", key]);
    });

    it("shows no such line under a subject with records in the state", () => {
        const shown = texts(drawRow(subject("s1", "Asha", {Rejected: [{uuid: "enc-9"}]}), "Rejected"));

        expect(shown).toEqual(["Asha", "enc-9"]);
    });

    it("has an English message for every key it uses", () => {
        const en = require("../../../translations/en.json").translations;
        ["Pending", "Approved", "Rejected", undefined].forEach((state) => expect(en[noRecordMessageKey(state)]).toBeTruthy());
    });
});
