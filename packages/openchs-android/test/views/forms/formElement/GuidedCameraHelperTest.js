import {assert} from "chai";
import {toPickerResponse, isGuidedCameraEnabled, resizeCapturedImage} from "../../../../src/views/form/formElement/GuidedCameraHelper";

describe('GuidedCameraHelper', () => {
    it('toPickerResponse builds a picker-shaped response and adds file:// once', () => {
        const r = toPickerResponse('/data/x/photo.jpg', 123);
        assert.equal(r.assets.length, 1);
        assert.equal(r.assets[0].uri, 'file:///data/x/photo.jpg');
        assert.equal(r.assets[0].fileName, 'photo.jpg');
        assert.equal(r.assets[0].type, 'image/jpeg');
        assert.equal(r.assets[0].fileSize, 123);
    });

    it('toPickerResponse does not double-prefix an existing file:// uri', () => {
        const r = toPickerResponse('file:///data/x/photo.jpg');
        assert.equal(r.assets[0].uri, 'file:///data/x/photo.jpg');
        assert.equal(r.assets[0].fileName, 'photo.jpg');
    });

    it('isGuidedCameraEnabled is true only for image elements with a truthy keyValue', () => {
        assert.isTrue(isGuidedCameraEnabled(true, true));
        assert.isTrue(isGuidedCameraEnabled(true, 'true'));
        assert.isFalse(isGuidedCameraEnabled(true, false));
        assert.isFalse(isGuidedCameraEnabled(true, undefined));
        assert.isFalse(isGuidedCameraEnabled(false, true));
    });

    it('resizeCapturedImage calls the resizer with the element dimensions and returns a file:// uri', async () => {
        const calls = [];
        const fakeResizer = {
            createResizedImage: (...args) => {
                calls.push(args);
                return Promise.resolve({uri: 'file:///cache/resized.jpg', path: '/cache/resized.jpg'});
            }
        };
        const uri = await resizeCapturedImage(fakeResizer, '/data/x/photo.jpg', {maxWidth: 1280, maxHeight: 960, quality: 1});
        assert.equal(uri, 'file:///cache/resized.jpg');
        assert.equal(calls[0][0], '/data/x/photo.jpg');
        assert.equal(calls[0][1], 1280);
        assert.equal(calls[0][2], 960);
        assert.equal(calls[0][3], 'JPEG');
        assert.equal(calls[0][4], 100); // quality 1 -> 0..100
    });

    it('resizeCapturedImage rejects when the resizer rejects', async () => {
        const fakeResizer = {createResizedImage: () => Promise.reject(new Error('resize boom'))};
        let threw = false;
        try {
            await resizeCapturedImage(fakeResizer, '/data/x/photo.jpg', {maxWidth: 1280, maxHeight: 960, quality: 1});
        } catch (e) {
            threw = true;
        }
        assert.isTrue(threw);
    });
});
