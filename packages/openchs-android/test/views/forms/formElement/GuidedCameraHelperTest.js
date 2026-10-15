import {assert} from "chai";
import {toPickerResponse, isGuidedCameraEnabled, resizeCapturedImage, deviceWithFormats, photoSettingsProblem} from "../../../../src/views/form/formElement/GuidedCameraHelper";

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
        // QA on #1996, 8 Oct 2026: from a bare path the resizer cannot read the photo's orientation
        // tag, so it saved the picture sideways. A file:// URI lets it turn the picture upright.
        assert.equal(calls[0][0], 'file:///data/x/photo.jpg');
        assert.equal(calls[0][1], 1280);
        assert.equal(calls[0][2], 960);
        assert.equal(calls[0][3], 'JPEG');
        assert.equal(calls[0][4], 100); // quality 1 -> 0..100
        // Never enlarged, as the plain photo picker never enlarges one.
        assert.deepEqual(calls[0][8], {mode: 'contain', onlyScaleDown: true});
    });

    // App Designer saves 0 when a size field is cleared, and the plain picker then keeps the photo's own size.
    [{maxWidth: 0, maxHeight: 960}, {maxWidth: 1280, maxHeight: 0}].forEach((limits) => {
        it(`resizeCapturedImage keeps the photo's own size for a size limit of 0 (${JSON.stringify(limits)})`, async () => {
            const calls = [];
            const fakeResizer = {createResizedImage: (...args) => { calls.push(args); return Promise.resolve({uri: 'file:///cache/resized.jpg'}); }};
            await resizeCapturedImage(fakeResizer, '/data/x/photo.jpg', {...limits, quality: 0.8});
            assert.isAbove(calls[0][1], 20000);
            assert.isAbove(calls[0][2], 20000);
            assert.equal(calls[0][4], 80);
            assert.deepEqual(calls[0][8], {mode: 'contain', onlyScaleDown: true});
        });
    });

    it('resizeCapturedImage passes a photo that is already a file:// URI as it is', async () => {
        const calls = [];
        const fakeResizer = {createResizedImage: (...args) => { calls.push(args); return Promise.resolve({uri: '/cache/resized.jpg'}); }};
        const uri = await resizeCapturedImage(fakeResizer, 'file:///data/x/photo.jpg', {maxWidth: 1280, maxHeight: 960, quality: 1});
        assert.equal(calls[0][0], 'file:///data/x/photo.jpg');
        assert.equal(uri, 'file:///cache/resized.jpg');
    });

    // QA on #1996, 8 Oct 2026: imageQuality 'abc' reached the resizer as NaN and saved a near-useless photo.
    describe('photoSettingsProblem', () => {
        const defaults = {maxWidth: 1280, maxHeight: 960, quality: 1};

        it('accepts the defaults and any quality above 0 up to 1', () => {
            assert.isNull(photoSettingsProblem(defaults));
            assert.isNull(photoSettingsProblem({...defaults, quality: 0.5}));
            assert.isNull(photoSettingsProblem({maxWidth: 1600, maxHeight: 1200, quality: 0.01}));
        });

        it('names a photo quality that is not a number above 0 up to 1', () => {
            ['abc', '0.8', 0, -0.2, 1.5, NaN, true, null].forEach((quality) => {
                assert.include(photoSettingsProblem({...defaults, quality}), 'imageQuality', `quality ${quality}`);
            });
        });

        it('accepts a width or height of 0, which App Designer saves for a cleared field', () => {
            assert.isNull(photoSettingsProblem({...defaults, maxWidth: 0}));
            assert.isNull(photoSettingsProblem({...defaults, maxHeight: 0}));
        });

        it('names a width or height that is not a number of 0 or more', () => {
            assert.include(photoSettingsProblem({...defaults, maxWidth: 'wide'}), 'maxWidth');
            assert.include(photoSettingsProblem({...defaults, maxHeight: -1}), 'maxHeight');
            assert.include(photoSettingsProblem({...defaults, maxHeight: Infinity}), 'maxHeight');
        });

        it('lists every bad setting at once', () => {
            const problem = photoSettingsProblem({maxWidth: -1, maxHeight: 'x', quality: 'abc'});
            ['maxWidth', 'maxHeight', 'imageQuality'].forEach((setting) => assert.include(problem, setting));
        });
    });

    it('deviceWithFormats hides a device that reports no formats, so useCameraFormat cannot throw', () => {
        // The throw lands during render, so it takes the modal down rather than degrading.
        assert.isUndefined(deviceWithFormats({id: 'back', formats: []}));
        assert.isUndefined(deviceWithFormats({id: 'back'}));
        assert.isUndefined(deviceWithFormats({id: 'back', formats: null}));
        assert.isUndefined(deviceWithFormats(undefined));
        assert.isUndefined(deviceWithFormats(null));
    });

    it('deviceWithFormats passes a usable device straight through', () => {
        const device = {id: 'back', formats: [{photoWidth: 1600, photoHeight: 1200}]};
        assert.strictEqual(deviceWithFormats(device), device);
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
