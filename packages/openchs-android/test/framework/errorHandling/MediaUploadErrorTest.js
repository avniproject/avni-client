import {expect} from 'chai';
import MediaUploadError from '../../../src/framework/errorHandling/MediaUploadError';

const anError = (overrides = {}) => new MediaUploadError({
    fileName: '6f1c0e2a-1111-4a3b-9d21-abc123def456.jpg',
    mediaType: 'Image',
    sizeBytes: 1153024,
    bytesSent: 1048576,
    cause: 'Unable to resolve host "s3.ap-south-1.amazonaws.com": No address associated with hostname',
    originalError: new Error('original'),
    ...overrides
});

describe('MediaUploadError', () => {
    describe('identity', () => {
        it('is an instanceof MediaUploadError', () => {
            expect(anError() instanceof MediaUploadError).to.equal(true);
        });

        it('is still an Error, so existing error handling keeps working', () => {
            expect(anError() instanceof Error).to.equal(true);
        });

        it('keeps the cause in the message, so a raw log or Bugsnag report is not empty', () => {
            expect(anError().message).to.contain('No address associated with hostname');
        });

        it('carries every field needed by the log line and the telemetry row', () => {
            const error = anError();
            expect(error.fileName).to.equal('6f1c0e2a-1111-4a3b-9d21-abc123def456.jpg');
            expect(error.mediaType).to.equal('Image');
            expect(error.sizeBytes).to.equal(1153024);
            expect(error.bytesSent).to.equal(1048576);
            expect(error.originalError.message).to.equal('original');
        });
    });

    describe('causeCategory', () => {
        // The categories are the field someone GROUPs BY when asking "why are devices
        // blocked?" — the table #2067 had to rebuild by hand from a seven-week log dump.
        // So DNS and connect failures are kept apart here even though they read the same
        // to the user; see the userMessage tests below for that collapse.

        it('separates a DNS resolution failure from a connect failure', () => {
            expect(MediaUploadError.causeCategory(anError())).to.equal('dnsFailure');
        });

        it('classifies an unknown-host error as a DNS failure', () => {
            expect(MediaUploadError.causeCategory(anError({
                cause: 'java.net.UnknownHostException: s3.ap-south-1.amazonaws.com'
            }))).to.equal('dnsFailure');
        });

        it('classifies an Android connect failure as a connect failure, not DNS', () => {
            // Exact string produced on a device with the S3 host blocked, 7 Sep 2026.
            // The resolved IP in the message is itself proof DNS succeeded.
            expect(MediaUploadError.causeCategory(anError({
                cause: 'Failed to connect to s3.ap-south-1.amazonaws.com/3.5.211.40:443'
            }))).to.equal('connectFailure');
        });

        it('classifies a generic network failure as a connect failure', () => {
            expect(MediaUploadError.causeCategory(anError({cause: 'Network request failed'}))).to.equal('connectFailure');
        });

        it('classifies the stall watchdog cancel as a stalled upload', () => {
            expect(MediaUploadError.causeCategory(anError({cause: 'ReactNativeBlobUtilCanceledFetch'}))).to.equal('uploadStalled');
        });

        it('classifies a cancel that also mentions the network as stalled, not connect', () => {
            // the watchdog cancel message can carry network wording; the cancel is the real cause
            expect(MediaUploadError.causeCategory(anError({cause: 'ReactNativeBlobUtilCanceledFetch: Network request failed'}))).to.equal('uploadStalled');
        });

        it('classifies a rejection by the storage server as an HTTP error', () => {
            // the message checkUploadStatus throws
            expect(MediaUploadError.causeCategory(anError({
                cause: 'Media upload failed. HTTP Status:403. EntityName: Individual, FileName: abc.jpg, '
            }))).to.equal('httpError');
        });

        it('falls back to unknown for anything unrecognised', () => {
            expect(MediaUploadError.causeCategory(anError({cause: 'something nobody has seen before'}))).to.equal('unknown');
        });

        it('falls back to unknown when there is no cause at all', () => {
            expect(MediaUploadError.causeCategory(anError({cause: undefined}))).to.equal('unknown');
        });
    });

    describe('mediaTypeKey', () => {
        it('maps both image types to photo', () => {
            expect(MediaUploadError.mediaTypeKey('Image')).to.equal('mediaTypePhoto');
            expect(MediaUploadError.mediaTypeKey('ImageV2')).to.equal('mediaTypePhoto');
        });

        it('maps a profile picture to photo', () => {
            expect(MediaUploadError.mediaTypeKey('Profile-Pics')).to.equal('mediaTypePhoto');
        });

        it('maps video and audio to their own words', () => {
            expect(MediaUploadError.mediaTypeKey('Video')).to.equal('mediaTypeVideo');
            expect(MediaUploadError.mediaTypeKey('Audio')).to.equal('mediaTypeAudio');
        });

        it('falls back to the generic word for an unknown type', () => {
            expect(MediaUploadError.mediaTypeKey('File')).to.equal('mediaTypeFile');
            expect(MediaUploadError.mediaTypeKey(undefined)).to.equal('mediaTypeFile');
        });
    });

    describe('logLine', () => {
        it('carries file, size, bytes sent and cause on one line', () => {
            const line = MediaUploadError.logLine(anError());
            expect(line).to.contain('6f1c0e2a-1111-4a3b-9d21-abc123def456.jpg');
            expect(line).to.contain('size=1153024');
            expect(line).to.contain('sent=1048576');
            expect(line).to.contain('No address associated with hostname');
            expect(line.split('\n').length).to.equal(1);
        });

        it('is greppable by a fixed prefix, so support can find it in a 15MB log', () => {
            expect(MediaUploadError.logLine(anError())).to.contain('MediaUpload blocked sync');
        });

        it('renders unknown size and bytes sent without printing "null"', () => {
            const line = MediaUploadError.logLine(anError({sizeBytes: null, bytesSent: null}));
            expect(line).to.contain('size=unknown');
            expect(line).to.contain('sent=unknown');
        });
    });

    describe('failureDetail', () => {
        it('records the stage, category and cause plus the media fields', () => {
            expect(MediaUploadError.failureDetail(anError())).to.deep.equal({
                stage: 'mediaUpload',
                category: 'dnsFailure',
                cause: 'Unable to resolve host "s3.ap-south-1.amazonaws.com": No address associated with hostname',
                fileName: '6f1c0e2a-1111-4a3b-9d21-abc123def456.jpg',
                mediaType: 'Image',
                sizeBytes: 1153024,
                bytesSent: 1048576
            });
        });
    });

    describe('userMessage', () => {
        const i18n = {t: (key, opts) => (opts ? `${key}(${JSON.stringify(opts)})` : key)};

        it('names the media type and the mapped reason, and never the filename', () => {
            const message = MediaUploadError.userMessage(anError(), i18n);
            expect(message).to.contain('mediaUploadBlockedSync');
            expect(message).to.contain('mediaTypePhoto');
            expect(message).to.contain('mediaUploadReasonStorageUnreachable');
            expect(message).to.not.contain('6f1c0e2a');
        });

        it('does not leak the raw cause into what the user reads', () => {
            expect(MediaUploadError.userMessage(anError(), i18n)).to.not.contain('s3.ap-south-1.amazonaws.com');
        });

        it('reads the same to the user whether DNS or the connection failed', () => {
            // The diagnostic split must not reach the dialog: neither "your DNS is broken"
            // nor "TCP connect refused" is a sentence a field worker can act on, and the
            // action is identical either way.
            const dns = MediaUploadError.userMessage(anError({
                cause: 'Unable to resolve host "s3.ap-south-1.amazonaws.com": No address associated with hostname'
            }), i18n);
            const connect = MediaUploadError.userMessage(anError({
                cause: 'Failed to connect to s3.ap-south-1.amazonaws.com/3.5.211.40:443'
            }), i18n);
            expect(dns).to.equal(connect);
            expect(dns).to.contain('mediaUploadReasonStorageUnreachable');
        });

        it('gives an HTTP rejection and an unknown cause the same generic sentence', () => {
            const http = MediaUploadError.userMessage(anError({cause: 'Media upload failed. HTTP Status:403.'}), i18n);
            const unknown = MediaUploadError.userMessage(anError({cause: 'who knows'}), i18n);
            expect(http).to.equal(unknown);
            expect(http).to.contain('mediaUploadReasonUploadFailed');
        });

        it('still gives a stalled upload its own sentence', () => {
            expect(MediaUploadError.userMessage(anError({cause: 'ReactNativeBlobUtilCanceledFetch'}), i18n))
                .to.contain('mediaUploadReasonUploadStalled');
        });
    });
});
