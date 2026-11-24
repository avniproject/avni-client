import {expect} from 'chai';
import MediaUploadError from '../../../src/framework/errorHandling/MediaUploadError';

const original = () => new Error('Unable to resolve host "s3.ap-south-1.amazonaws.com": No address associated with hostname');

describe('MediaUploadError', () => {
    it('is an instanceof MediaUploadError, which the sync dialog branches on', () => {
        expect(new MediaUploadError(original()) instanceof MediaUploadError).to.equal(true);
    });

    it('is still an Error, so existing error handling keeps working', () => {
        expect(new MediaUploadError(original()) instanceof Error).to.equal(true);
    });

    it('keeps the original cause in the message, so a raw log is not empty', () => {
        expect(new MediaUploadError(original()).message).to.contain('No address associated with hostname');
    });

    it('keeps the original error', () => {
        const error = original();
        expect(new MediaUploadError(error).originalError).to.equal(error);
    });

    it('accepts a bare string rejection', () => {
        expect(new MediaUploadError('Network request failed').message).to.contain('Network request failed');
    });
});
