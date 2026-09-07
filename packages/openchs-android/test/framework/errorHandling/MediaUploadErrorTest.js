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
        it('classifies a DNS resolution failure as the storage server being unreachable', () => {
            expect(MediaUploadError.causeCategory(anError())).to.equal('storageUnreachable');
        });

        it('classifies a generic network failure as the storage server being unreachable', () => {
            expect(MediaUploadError.causeCategory(anError({cause: 'Network request failed'}))).to.equal('storageUnreachable');
        });

        it('classifies the stall watchdog cancel as a stalled upload', () => {
            expect(MediaUploadError.causeCategory(anError({cause: 'ReactNativeBlobUtilCanceledFetch'}))).to.equal('uploadStalled');
        });

        it('classifies a cancel that also mentions the network as stalled, not unreachable', () => {
            // the watchdog cancel message can carry network wording; the cancel is the real cause
            expect(MediaUploadError.causeCategory(anError({cause: 'ReactNativeBlobUtilCanceledFetch: Network request failed'}))).to.equal('uploadStalled');
        });

        it('falls back to a generic failure for anything unrecognised', () => {
            expect(MediaUploadError.causeCategory(anError({cause: 'Media upload failed. HTTP Status:500.'}))).to.equal('uploadFailed');
        });

        it('falls back to a generic failure when there is no cause at all', () => {
            expect(MediaUploadError.causeCategory(anError({cause: undefined}))).to.equal('uploadFailed');
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
                category: 'storageUnreachable',
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
    });
});
