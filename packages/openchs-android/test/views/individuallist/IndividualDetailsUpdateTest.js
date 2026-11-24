jest.mock("../../../src/utility/CHSNavigator", () => ({__esModule: true, default: {}}));
jest.mock("../../../src/views/common/SubjectInfoCard", () => ({__esModule: true, default: () => null}));

import IndividualDetails from "../../../src/views/individuallist/IndividualDetails";

const shouldUpdate = (prev, next) => IndividualDetails.prototype.shouldComponentUpdate.call({props: prev}, next);

const row = (visitName) => ({individual: {uuid: "school-1"}, visitInfo: {visitName}});
const props = (individualWithMetadata) => ({individualWithMetadata, header: "01-10-2026", cardType: "overdue"});

describe("IndividualDetails.shouldComponentUpdate", () => {
    it("redraws a row whose subject stays but whose visits changed with a new filter", () => {
        const allVisits = [{visit: ["Program", "School Annual Form"]}, {visit: ["Program", "Monthly Visit"]}];
        const annualOnly = [{visit: ["Program", "School Annual Form"]}];

        expect(shouldUpdate(props(row(allVisits)), props(row(annualOnly)))).toBe(true);
    });

    it("does not redraw when the same row data is drawn again", () => {
        const sameRow = row([{visit: ["Program", "Monthly Visit"]}]);

        expect(shouldUpdate(props(sameRow), props(sameRow))).toBe(false);
    });

    it("does not redraw a Total-card row, whose empty visit list is rebuilt on every draw", () => {
        const individual = {uuid: "school-1"};
        const prev = props({individual, visitInfo: {visitName: []}});
        const next = props({individual, visitInfo: {visitName: []}});

        expect(shouldUpdate(prev, next)).toBe(false);
    });

    it("redraws when the subject changes", () => {
        const next = props({individual: {uuid: "school-2"}, visitInfo: {visitName: []}});

        expect(shouldUpdate(props(row([])), next)).toBe(true);
    });
});
