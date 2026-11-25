import {WorkItem, WorkList, WorkLists} from "avni-models";
import {keepReturnToSource, returnsToSource} from "../../src/utility/ReturnToSource";

const listsWith = (parameters) =>
    new WorkLists(new WorkList('w', [new WorkItem('1', WorkItem.type.REGISTRATION, parameters)]));

describe("returnsToSource", () => {
    it("is true when the flag is set", () => expect(returnsToSource(listsWith({returnToSource: true}))).toBe(true));
    it("is false when the flag is absent", () => expect(returnsToSource(listsWith({}))).toBe(false));
    it("is false when the flag is the string 'true'", () => expect(returnsToSource(listsWith({returnToSource: 'true'}))).toBe(false));
    it("is false for null work lists", () => expect(returnsToSource(null)).toBe(false));
    it("is false when the item has no parameters", () => expect(returnsToSource(listsWith(undefined))).toBe(false));
});

describe("keepReturnToSource", () => {
    it("sets the flag on the current item", () => {
        const lists = listsWith({a: 1});
        keepReturnToSource(lists);
        expect(lists.getCurrentWorkItem().parameters).toEqual({a: 1, returnToSource: true});
    });
    it("creates parameters when the item has none", () => {
        const lists = listsWith(undefined);
        keepReturnToSource(lists);
        expect(returnsToSource(lists)).toBe(true);
    });
    it("does nothing for null", () => expect(() => keepReturnToSource(null)).not.toThrow());
});
