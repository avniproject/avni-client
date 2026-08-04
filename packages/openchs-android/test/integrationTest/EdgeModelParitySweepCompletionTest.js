import {assert} from "chai";

// react-native-fs has no JS fallback off-device, and the sweep is only ever exercised through it.
// writeFile/readFile are backed by a dict so the sweep's read-back of the scores file is real.
const mockStore = {};
const mockFs = {
    ExternalDirectoryPath: "/ext",
    mkdir: jest.fn(() => Promise.resolve()),
    exists: jest.fn(() => Promise.resolve(false)),
    unlink: jest.fn(() => Promise.resolve()),
    readDir: jest.fn(() => Promise.resolve([])),
    writeFile: jest.fn((path, contents) => {
        mockStore[path] = contents;
        return Promise.resolve();
    }),
    readFile: jest.fn((path) => Promise.resolve(mockStore[path]))
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

// The runner does not await the test, so green means started and a throw rejects an unobserved
// promise — these files are the only honest completion signal.
describe("EdgeModelParityIntegrationTest completion sentinel", () => {
    beforeEach(() => {
        Object.values(mockFs).forEach((value) => value.mockClear && value.mockClear());
        Object.keys(mockStore).forEach((key) => delete mockStore[key]);
        mockFs.exists.mockImplementation(() => Promise.resolve(false));
        mockFs.mkdir.mockImplementation(() => Promise.resolve());
        mockFs.writeFile.mockImplementation((path, contents) => {
            mockStore[path] = contents;
            return Promise.resolve();
        });
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
        // Three rows, two sharing a sha, so unanimous-AND runs over 2 distinct models.
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

    it("records a setup failure, rather than leaving the collector to time out on silence", async () => {
        // mkdir and the sentinel clearing run before any image is read; a throw there used to escape
        // the try, so nothing was written and run-parity.sh waited out its full timeout.
        mockFs.mkdir.mockImplementation(() => Promise.reject(new Error("ENOENT: external storage not mounted")));

        let thrown = null;
        try {
            await stubbedTest(edgeModelService(scoresEveryFold)).runParitySweep();
        } catch (error) {
            thrown = error;
        }

        assert.isNotNull(thrown);
        assert.include(writtenBody(`${OUT}/run-failed.txt`), "external storage not mounted");
    });

    it("refuses to report a truncated scores file as a complete run", async () => {
        mockFs.readDir.mockImplementation(() => Promise.resolve(
            [imageEntry("a.jpg"), imageEntry("b.jpg"), imageEntry("c.jpg")]));
        // Device runs out of space mid-write: the file lands with fewer rows than were scored.
        mockFs.writeFile.mockImplementation((path, contents) => {
            mockStore[path] = path.endsWith("per_model_scores.csv")
                ? contents.split("\n").slice(0, 3).join("\n") + "\n"
                : contents;
            return Promise.resolve();
        });

        let thrown = null;
        try {
            await stubbedTest(edgeModelService(scoresEveryFold)).runParitySweep();
        } catch (error) {
            thrown = error;
        }

        assert.isNotNull(thrown, "a truncated scores file must fail the sweep");
        assert.include(thrown.message, "truncated");
        assert.notInclude(writtenPaths(), `${OUT}/run-complete.json`);
    });

    it("clears a previous run's sentinels before starting", async () => {
        mockFs.exists.mockImplementation(() => Promise.resolve(true));
        mockFs.readDir.mockImplementation(() => Promise.resolve([imageEntry("a.jpg")]));
        await stubbedTest(edgeModelService(scoresEveryFold)).runParitySweep();

        assert.deepEqual(mockFs.unlink.mock.calls.map((call) => call[0]),
            [`${OUT}/run-complete.json`, `${OUT}/run-failed.txt`]);
    });
});
