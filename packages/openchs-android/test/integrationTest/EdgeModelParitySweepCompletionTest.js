import {assert} from "chai";

// react-native-fs has no JS fallback off-device, and the sweep is only ever exercised through it.
const mockFs = {
    ExternalDirectoryPath: "/ext",
    mkdir: jest.fn(() => Promise.resolve()),
    exists: jest.fn(() => Promise.resolve(false)),
    unlink: jest.fn(() => Promise.resolve()),
    readDir: jest.fn(() => Promise.resolve([])),
    writeFile: jest.fn(() => Promise.resolve())
};
jest.mock("react-native-fs", () => mockFs);

const EdgeModelParityIntegrationTest = require("../../integrationTest/EdgeModelParityIntegrationTest").default;

const OUT = "/ext/parity/out";
const FOLDS = [
    {name: "mvit2_fold1_6", sha256: "sha6", category: "edgeModel", contentKey: "k6"},
    {name: "mvit2_fold1_8", sha256: "sha8", category: "edgeModel", contentKey: "k8"},
    {name: "mvit2_fold2_8", sha256: "sha82", category: "edgeModel", contentKey: "k82"}
];

function imageEntry(name) {
    return {name: name, path: `/ext/parity/images/${name}`, isFile: () => true};
}

function stubbedTest(edgeModelService) {
    const test = new EdgeModelParityIntegrationTest();
    test.getService = () => edgeModelService;
    test.log = () => {};
    return test;
}

function edgeModelService(runEnsembleInferenceOnImage) {
    return {getAllNonVoided: () => FOLDS, runEnsembleInferenceOnImage: runEnsembleInferenceOnImage};
}

const scoresEveryFold = () => Promise.resolve({
    perModel: [{sha256: "sha6", logit: 1}, {sha256: "sha8", logit: 1}, {sha256: "sha82", logit: 1}]
});

function writtenPaths() {
    return mockFs.writeFile.mock.calls.map((call) => call[0]);
}

function writtenBody(path) {
    const call = mockFs.writeFile.mock.calls.find((c) => c[0] === path);
    return call && call[1];
}

// IntegrationTestRunner calls testMethod.success() on the line after invoking the test, without
// awaiting it, so the device screen goes green at the first await inside runParitySweep — before any
// image is scored — and a throw rejects a promise nobody observes. run-parity.sh therefore trusts
// only these files. See avni-client#2035.
describe("EdgeModelParityIntegrationTest completion sentinel", () => {
    beforeEach(() => {
        Object.values(mockFs).forEach((value) => value.mockClear && value.mockClear());
        mockFs.exists.mockImplementation(() => Promise.resolve(false));
    });

    it("writes the completion sentinel only after both result files", async () => {
        mockFs.readDir.mockImplementation(() => Promise.resolve([imageEntry("a.jpg"), imageEntry("b.jpg")]));
        await stubbedTest(edgeModelService(scoresEveryFold)).runParitySweep();

        assert.deepEqual(writtenPaths(), [
            `${OUT}/per_model_scores.csv`,
            `${OUT}/fold-mapping.csv`,
            `${OUT}/run-complete.json`
        ]);
    });

    it("records the row count in the sentinel so a short sweep can be spotted on collection", async () => {
        mockFs.readDir.mockImplementation(() => Promise.resolve([imageEntry("a.jpg"), imageEntry("b.jpg")]));
        await stubbedTest(edgeModelService(scoresEveryFold)).runParitySweep();

        assert.equal(JSON.parse(writtenBody(`${OUT}/run-complete.json`)).rows, 2);
    });

    it("writes no completion sentinel and records the failure when the sweep throws", async () => {
        mockFs.readDir.mockImplementation(() => Promise.resolve([imageEntry("a.jpg")]));
        // The #1985 shape: three rows, two sharing a sha, so unanimous-AND runs over 2 models.
        const duplicateFold = () => Promise.resolve({
            perModel: [{sha256: "sha6", logit: 1}, {sha256: "sha6", logit: 1}, {sha256: "sha82", logit: 1}]
        });

        let thrown = null;
        try {
            await stubbedTest(edgeModelService(duplicateFold)).runParitySweep();
        } catch (error) {
            thrown = error;
        }

        assert.isNotNull(thrown, "the sweep must still reject so 'Run & Throw' surfaces it");
        assert.notInclude(writtenPaths(), `${OUT}/run-complete.json`);
        assert.include(writtenBody(`${OUT}/run-failed.txt`), "duplicate fold sha256");
    });

    it("clears a previous run's sentinels before starting", async () => {
        mockFs.exists.mockImplementation(() => Promise.resolve(true));
        mockFs.readDir.mockImplementation(() => Promise.resolve([imageEntry("a.jpg")]));
        await stubbedTest(edgeModelService(scoresEveryFold)).runParitySweep();

        assert.deepEqual(mockFs.unlink.mock.calls.map((call) => call[0]),
            [`${OUT}/run-complete.json`, `${OUT}/run-failed.txt`]);
    });
});
