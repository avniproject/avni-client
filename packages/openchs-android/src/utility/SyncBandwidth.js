import _ from "lodash";

// Measured from the sync's own traffic; a separate speed test would cost users data on slow links.
export const BandwidthDirections = Object.freeze({
    // Includes server query time and counts unzipped bytes: what the user got, not their line speed.
    DOWNLOAD_THROUGHPUT: 'downloadThroughput',
    // One POST per record, server time included; most are under the sample size, so often absent.
    UPLOAD_THROUGHPUT: 'uploadThroughput',
    // Files are already compressed, so this is the closest to real upload speed.
    MEDIA_UPLOAD: 'mediaUpload'
});

// String.length counts UTF-16 units and undercounts Indic text, which is 3 bytes per letter.
export const utf8ByteLength = (text) => {
    if (!_.isString(text)) return 0;
    if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(text).length;
    let bytes = 0;
    for (let i = 0; i < text.length; i++) {
        const code = text.charCodeAt(i);
        if (code < 0x80) bytes += 1;
        else if (code < 0x800) bytes += 2;
        else if (code >= 0xD800 && code <= 0xDBFF) { bytes += 4; i++; } // surrogate pair: one 4-byte character
        else bytes += 3;
    }
    return bytes;
};

export const withoutSpeedSample = (timings) => _.omit(timings, ['bytes', 'transferMs']);

// Smaller requests are mostly round-trip time and would drag the average far below line speed.
export const MIN_SPEED_SAMPLE_BYTES = 16 * 1024;

// Too short to reach the sample size even at 3 bytes per unit, so skip the encoding cost.
export const speedSampleBytes = (text) =>
    (_.isString(text) && text.length * 3 >= MIN_SPEED_SAMPLE_BYTES) ? utf8ByteLength(text) : 0;

export class TransferStats {
    constructor() {
        this.bytes = 0;
        this.transferMs = 0;
    }

    add({bytes, transferMs} = {}) {
        if (!(bytes >= MIN_SPEED_SAMPLE_BYTES) || !(transferMs > 0)) return;
        this.bytes += bytes;
        this.transferMs += transferMs;
    }
}

// k = 1000, as network speeds are quoted.
const kbpsOf = (bytes, transferMs) => Math.round((bytes * 8 / transferMs) * 10) / 10;

const directionOf = (stats) => (stats && stats.bytes > 0 && stats.transferMs > 0)
    ? {bytes: stats.bytes, transferMs: Math.round(stats.transferMs), kbps: kbpsOf(stats.bytes, stats.transferMs)}
    : undefined;

// Total bytes over total time, so each request counts in proportion to how much it carried.
export const computeSyncBandwidth = ({download, upload, mediaUpload} = {}) => _.omitBy({
    [BandwidthDirections.DOWNLOAD_THROUGHPUT]: directionOf(download),
    [BandwidthDirections.UPLOAD_THROUGHPUT]: directionOf(upload),
    [BandwidthDirections.MEDIA_UPLOAD]: directionOf(mediaUpload)
}, _.isUndefined);

export const bandwidthFirebaseParams = (bandwidth) => _.mapKeys(
    _.mapValues(bandwidth, 'kbps'),
    (kbps, direction) => `${_.snakeCase(direction)}_kbps`);
