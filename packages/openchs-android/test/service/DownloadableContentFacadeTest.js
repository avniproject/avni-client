import {assert} from "chai";

jest.mock("../../src/framework/bean/Service", () => () => (target) => target);

const mockService = {
    getAllNonVoided: jest.fn(),
    blobPath: (row) => `/mock/external/Avni/${row.contentKey}`
};

jest.mock("../../src/GlobalContext", () => ({
    __esModule: true,
    default: {getInstance: () => ({beanRegistry: {getService: () => mockService}})}
}));

import downloadableContent from "../../src/service/facade/DownloadableContentFacade";

function row({category = "guidanceImage", sha256 = "sha-1", contentKey,
              sequence = 3, kind = "reckoner", site = "Left buccal mucosa"} = {}) {
    return {
        category, sha256,
        contentKey: contentKey === undefined ? `guidance/${sha256}.png` : contentKey,
        getPayload: () => ({sequence, kind, site})
    };
}

function withRows(rows) {
    mockService.getAllNonVoided.mockReturnValue(rows);
}

describe("downloadableContent.byPayload", () => {
    beforeEach(() => jest.clearAllMocks());

    it("finds the row matching both the sequence and the kind", () => {
        withRows([
            row({sequence: 3, kind: "overlay", sha256: "overlay-3"}),
            row({sequence: 3, kind: "reckoner", sha256: "reckoner-3"}),
            row({sequence: 4, kind: "reckoner", sha256: "reckoner-4"})
        ]);
        const asset = downloadableContent.byPayload("guidanceImage", {sequence: 3, kind: "reckoner"});
        assert.equal(asset.path(), "/mock/external/Avni/guidance/reckoner-3.png");
    });

    it("returns undefined rather than throwing when nothing matches", () => {
        withRows([row({sequence: 3, kind: "reckoner"})]);
        assert.isUndefined(downloadableContent.byPayload("guidanceImage", {sequence: 99, kind: "reckoner"}));
        assert.isUndefined(downloadableContent.byPayload("guidanceImage", {sequence: 3, kind: "overlay"}));
    });

    it("returns undefined for an empty table", () => {
        withRows([]);
        assert.isUndefined(downloadableContent.byPayload("guidanceImage", {sequence: 3, kind: "reckoner"}));
    });

    it("ignores rows of another category", () => {
        withRows([row({category: "edgeModel", sequence: 3, kind: "reckoner"})]);
        assert.isUndefined(downloadableContent.byPayload("guidanceImage", {sequence: 3, kind: "reckoner"}));
    });

    it("ignores rows the downloader would never have cached", () => {
        withRows([row({sha256: null}), row({contentKey: null, sha256: "sha-2"})]);
        assert.isUndefined(downloadableContent.byPayload("guidanceImage", {sequence: 3, kind: "reckoner"}));
    });

    it("reads other payload fields off the matched row", () => {
        withRows([row({site: "Right lateral tongue"})]);
        const asset = downloadableContent.byPayload("guidanceImage", {sequence: 3, kind: "reckoner"});
        assert.equal(asset.value("site"), "Right lateral tongue");
        assert.equal(asset.value("sequence"), 3);
        assert.isUndefined(asset.value("nope"));
    });

    it("takes the category from the caller rather than hardcoding one", () => {
        withRows([row({category: "someOtherCategory"})]);
        assert.isOk(downloadableContent.byPayload("someOtherCategory", {sequence: 3, kind: "reckoner"}));
    });

    it("matches the sequence by identity, not by coercion", () => {
        withRows([row({sequence: 3})]);
        assert.isUndefined(downloadableContent.byPayload("guidanceImage", {sequence: "3", kind: "reckoner"}));
    });

    it("reads voided rows out via getAllNonVoided", () => {
        withRows([row()]);
        downloadableContent.byPayload("guidanceImage", {sequence: 3, kind: "reckoner"});
        assert.equal(mockService.getAllNonVoided.mock.calls.length, 1);
    });

    it("exposes nothing that could write", () => {
        withRows([row()]);
        const asset = downloadableContent.byPayload("guidanceImage", {sequence: 3, kind: "reckoner"});
        ["save", "saveOrUpdate", "delete", "update"].forEach(method => {
            assert.isUndefined(asset[method], `${method} must not be reachable from a rule`);
            assert.isUndefined(downloadableContent[method]);
        });
    });
});

describe("downloadableContent.byPayload — arbitrary payload fields", () => {
    beforeEach(() => jest.clearAllMocks());

    it("matches on a single field", () => {
        withRows([row({sequence: 3, kind: "reckoner"}), row({sequence: 4, kind: "overlay", sha256: "sha-4"})]);
        assert.equal(downloadableContent.byPayload("guidanceImage", {sequence: 4}).value("kind"), "overlay");
    });

    it("requires every field of the match to agree", () => {
        withRows([row({sequence: 3, kind: "reckoner", site: "Palate"})]);
        assert.isOk(downloadableContent.byPayload("guidanceImage", {sequence: 3, site: "Palate"}));
        assert.isUndefined(downloadableContent.byPayload("guidanceImage", {sequence: 3, site: "Tongue"}));
    });

    it("matches any category's own payload shape, with no method per category", () => {
        // The point of the generic facade: a new kind of content needs no new lookup here.
        withRows([{category: "edgeModel", sha256: "m1", contentKey: "models/m1.bin",
                   getPayload: () => ({engine: "onnx", fold: 2})}]);
        assert.equal(downloadableContent.byPayload("edgeModel", {fold: 2}).value("engine"), "onnx");
    });

    it("an empty match takes the first usable row of the category", () => {
        withRows([row({sha256: "first"}), row({sha256: "second"})]);
        assert.equal(downloadableContent.byPayload("guidanceImage", {}).path(),
            "/mock/external/Avni/guidance/first.png");
    });
});

describe("downloadableContent.allByCategory", () => {
    beforeEach(() => jest.clearAllMocks());

    it("returns every usable row of the category", () => {
        withRows([row({sha256: "a"}), row({sha256: "b"}), row({category: "edgeModel", sha256: "c"})]);
        const all = downloadableContent.allByCategory("guidanceImage");
        assert.equal(all.length, 2);
        assert.deepEqual(all.map(item => item.value("kind")), ["reckoner", "reckoner"]);
    });

    it("excludes rows the downloader would never have cached", () => {
        withRows([row({sha256: null}), row({contentKey: null, sha256: "b"})]);
        assert.deepEqual(downloadableContent.allByCategory("guidanceImage"), []);
    });

    it("is empty, not undefined, for a category with no rows", () => {
        withRows([]);
        assert.deepEqual(downloadableContent.allByCategory("nothingHere"), []);
    });
});

describe("downloadableContent registration", () => {
    it("is on the services map handed to form-element rules", () => {
        const source = require("fs").readFileSync(
            require("path").join(__dirname, "../../src/service/RuleEvaluationService.js"), "utf8");
        assert.include(source, "downloadableContent: downloadableContentFacade",
            "rules reach this through params.services.downloadableContent");
    });
});
