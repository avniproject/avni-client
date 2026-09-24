// The search result row skips every re-render, which is what keeps scrolling cheap on large
// result sets. A checkbox has to get through that without re-costing single-select.

import {assert} from "chai";

jest.mock("../../../src/views/common/IndividualDetailsCard", () => "IndividualDetailsCard");

import IndividualSearchResultRow from "../../../src/views/individual/IndividualSearchResultRow";

const rowWith = (props) => Object.assign(Object.create(IndividualSearchResultRow.prototype), {props});

describe("IndividualSearchResultRow.shouldComponentUpdate", () => {
    it("never re-renders for single-select, where checked is absent on both sides", () => {
        const row = rowWith({item: {uuid: "i1"}, checked: undefined});
        assert.isFalse(row.shouldComponentUpdate({item: {uuid: "i1"}, checked: undefined}));
    });

    it("re-renders when the checkbox flips", () => {
        const row = rowWith({item: {uuid: "i1"}, checked: false});
        assert.isTrue(row.shouldComponentUpdate({item: {uuid: "i1"}, checked: true}));
    });

    it("does not re-render when only the item identity changes", () => {
        const row = rowWith({item: {uuid: "i1"}, checked: true});
        assert.isFalse(row.shouldComponentUpdate({item: {uuid: "i2"}, checked: true}));
    });
});
