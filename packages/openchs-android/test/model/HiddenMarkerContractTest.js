import {Concept} from "openchs-models";

// The same table sits in avni-webapp HiddenConceptUtil.test.js and avni-server ConceptTest.java.
// Each row is the hidden key-value's value as JSON on the wire, and whether it hides.
const WIRE_VALUES = [
    ['true', true],
    ['"true"', true],
    ['" true "', true],
    ['"\\t\\n\\rtrue\\r\\n"', true],
    ['false', false],
    ['"false"', false],
    ['"TRUE"', false],
    ['"True"', false],
    ['"yes"', false],
    ['1', false],
    ['"1"', false],
    ['null', false],
    ['""', false],
    ['"\\"true\\""', false],
    ['"\\u000btrue"', false],
    ['"\\ftrue"', false],
    ['"\\u00a0true"', false],
    ['[true]', false],
    ['{"value":true}', false],
];

const syncedConcept = (keyValues) => Concept.fromResource({uuid: "c-verdict", name: "AI verdict", dataType: "Text", keyValues});

describe("the hidden marker, as the phone reads a synced concept", () => {
    it.each(WIRE_VALUES)("reads %s as hidden: %s", (wireJson, hidden) => {
        expect(syncedConcept([{key: "hidden", value: JSON.parse(wireJson)}]).isHidden()).toBe(hidden);
    });

    it("lets the first hidden entry decide when the key appears twice", () => {
        expect(syncedConcept([{key: "hidden", value: false}, {key: "hidden", value: true}]).isHidden()).toBe(false);
    });

    it("reads a key spelled with a capital as a different key", () => {
        expect(syncedConcept([{key: "Hidden", value: true}]).isHidden()).toBe(false);
    });
});
