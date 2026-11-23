import {assert} from "chai";
import fs from "fs";
import path from "path";

const SRC = path.resolve(__dirname, "../../src");
const HELPER = path.join(SRC, "utility", "SubjectAddress.js");

const sourceFiles = (dir) => fs.readdirSync(dir, {withFileTypes: true}).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return /\.jsx?$/.test(entry.name) ? [full] : [];
});

// A subject received from another phone in a camp can have no village here, and the model's fullAddress() does not allow for that.
const linesMatching = (pattern) => sourceFiles(SRC)
    .filter((file) => file !== HELPER)
    .flatMap((file) => fs.readFileSync(file, "utf8").split("\n")
        .map((line, i) => ({line, at: `${path.relative(SRC, file)}:${i + 1}`}))
        .filter(({line}) => pattern.test(line) && !/^\s*(\/\/|\*)/.test(line)))
    .map(({at}) => at);

describe("subject address sweep", () => {
    it("reads a subject's full address only through SubjectAddress", () => {
        assert.deepEqual(linesMatching(/\.fullAddress\(/), []);
    });

    it("labels a subject with its village only through SubjectAddress", () => {
        assert.deepEqual(linesMatching(/lowestAddressLevel\.translatedFieldValue/), []);
    });
});
