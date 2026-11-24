import {
    bandwidthFirebaseParams,
    computeSyncBandwidth,
    MIN_SPEED_SAMPLE_BYTES,
    speedSampleBytes,
    TransferStats,
    utf8ByteLength
} from "../../src/utility/SyncBandwidth";

const statsOf = (...samples) => {
    const stats = new TransferStats();
    samples.forEach(sample => stats.add(sample));
    return stats;
};

describe("utf8ByteLength", () => {
    it("counts ASCII as one byte each", () => {
        expect(utf8ByteLength('{"a":1}')).toBe(7);
    });

    it("counts Indian-script letters as three bytes each", () => {
        expect(utf8ByteLength("राम")).toBe(9);
        expect(utf8ByteLength("తెలుగు")).toBe(18);
    });

    it("counts a two-byte and a four-byte character", () => {
        expect(utf8ByteLength("é")).toBe(2);
        expect(utf8ByteLength("😀")).toBe(4);
    });

    it("counts the same without a native TextEncoder", () => {
        const text = "राम {\"a\":1} é 😀";
        const native = utf8ByteLength(text);
        const original = global.TextEncoder;
        delete global.TextEncoder;
        try {
            expect(utf8ByteLength(text)).toBe(native);
            expect(native).toBe(25);
        } finally {
            global.TextEncoder = original;
        }
    });

    it("is zero for anything that is not a string", () => {
        expect(utf8ByteLength(undefined)).toBe(0);
        expect(utf8ByteLength(null)).toBe(0);
    });
});

describe("speedSampleBytes", () => {
    it("skips encoding text too short to reach the sample size", () => {
        expect(speedSampleBytes("राम".repeat(100))).toBe(0);
    });

    it("measures text that can reach the sample size", () => {
        const text = "राम".repeat(2000);
        expect(speedSampleBytes(text)).toBe(18000);
    });
});

describe("TransferStats", () => {
    it("adds up requests at or above the sample size", () => {
        expect(statsOf({bytes: 600000, transferMs: 2500}, {bytes: MIN_SPEED_SAMPLE_BYTES, transferMs: 100}))
            .toEqual({bytes: 600000 + MIN_SPEED_SAMPLE_BYTES, transferMs: 2600});
    });

    it("skips requests below the sample size, which are mostly round-trip time", () => {
        expect(statsOf({bytes: 400, transferMs: 400}, {bytes: MIN_SPEED_SAMPLE_BYTES - 1, transferMs: 300}))
            .toEqual({bytes: 0, transferMs: 0});
    });

    it("skips samples without a usable time or size", () => {
        expect(statsOf({bytes: 100000}, {transferMs: 50}, undefined, {bytes: 100000, transferMs: 0}))
            .toEqual({bytes: 0, transferMs: 0});
    });
});

describe("computeSyncBandwidth", () => {
    it("averages each direction as total bytes over total transfer time", () => {
        expect(computeSyncBandwidth({
            download: statsOf({bytes: 600000, transferMs: 2500}, {bytes: 400000, transferMs: 1500}),
            upload: statsOf({bytes: 50000, transferMs: 2000}),
            mediaUpload: statsOf({bytes: 3000000, transferMs: 12000})
        })).toEqual({
            downloadThroughput: {bytes: 1000000, transferMs: 4000, kbps: 2000},
            uploadThroughput: {bytes: 50000, transferMs: 2000, kbps: 200},
            mediaUpload: {bytes: 3000000, transferMs: 12000, kbps: 2000}
        });
    });

    it("is not dragged down by empty pull pages", () => {
        const emptyPages = Array.from({length: 40}, () => ({bytes: 400, transferMs: 400}));
        const download = statsOf({bytes: 200000, transferMs: 1000}, ...emptyPages);

        expect(computeSyncBandwidth({download}).downloadThroughput.kbps).toBe(1600);
    });

    it("leaves out a direction with no samples rather than sending zero", () => {
        const download = statsOf({bytes: 1000000, transferMs: 4000});
        expect(computeSyncBandwidth({download, upload: new TransferStats()}))
            .toEqual({downloadThroughput: {bytes: 1000000, transferMs: 4000, kbps: 2000}});
        expect(computeSyncBandwidth({})).toEqual({});
        expect(computeSyncBandwidth()).toEqual({});
    });

    it("flattens to the Firebase params", () => {
        expect(bandwidthFirebaseParams(computeSyncBandwidth({
            download: statsOf({bytes: 1000000, transferMs: 4000}),
            upload: statsOf({bytes: 50000, transferMs: 2000}),
            mediaUpload: statsOf({bytes: 3000000, transferMs: 12000})
        }))).toEqual({download_throughput_kbps: 2000, upload_throughput_kbps: 200, media_upload_kbps: 2000});
        expect(bandwidthFirebaseParams({})).toEqual({});
    });
});
