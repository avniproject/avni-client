jest.mock('../../src/framework/bean/Service', () => () => (target) => target);

const mockGet = jest.fn();
jest.mock('../../src/framework/http/requests', () => ({get: (...args) => mockGet(...args)}));

const mockDownloadWithoutAuth = jest.fn();
jest.mock('../../src/service/AuthAwareDownload', () => ({downloadWithoutAuth: (...args) => mockDownloadWithoutAuth(...args)}));

const mockFsState = {existing: new Set(), dirContents: {}, sizes: {}, hashes: {}};
const blobResponse = (size, status = 200) => ({respInfo: {status, headers: {'Content-Length': String(size)}}});
jest.mock('react-native-fs', () => ({
    DocumentDirectoryPath: '/mock/private',
    ExternalDirectoryPath: '/mock/external',
    exists: jest.fn((p) => Promise.resolve(mockFsState.existing.has(p))),
    unlink: jest.fn((p) => { mockFsState.existing.delete(p); return Promise.resolve(); }),
    mkdir: jest.fn(() => Promise.resolve()),
    writeFile: jest.fn((p) => { mockFsState.existing.add(p); return Promise.resolve(); }),
    moveFile: jest.fn((from, to) => { mockFsState.existing.delete(from); mockFsState.existing.add(to); return Promise.resolve(); }),
    readDir: jest.fn((dir) => Promise.resolve(mockFsState.dirContents[dir] || [])),
    stat: jest.fn((p) => Promise.resolve({size: mockFsState.sizes[p] || 0})),
    hash: jest.fn((p) => Promise.resolve(mockFsState.hashes[p])),
}));

jest.mock('react-native', () => ({NativeModules: {}}));

import fs from 'react-native-fs';
import DownloadableContentService, {contentBlobPath, describeError, isManagedContentKey} from '../../src/service/DownloadableContentService';
import FileSystem from '../../src/model/FileSystem';

const MODELS_DIR = FileSystem.getModelsDir();
const KEYS_DIR = FileSystem.getModelKeysDir();
const blobPath = (sha) => `${MODELS_DIR}/${sha}.bin`;
const keyPath = (sha) => `${KEYS_DIR}/${sha}.key`;

const item = (overrides) => ({
    name: 'edge-model', category: 'edgeModel',
    contentKey: 'models/abc.bin', sha256: 'abc', needsKey: false, voided: false, ...overrides
});

// Simulates a successful blob download of `size` bytes to the target path. Blobs are named after
// their own content hash, so an intact download hashes to the sha in its filename; pass `hash` to
// simulate a file that arrived the right size but corrupt inside.
const writesBlob = (size, hash) => (url, target) => {
    mockFsState.existing.add(target);
    mockFsState.sizes[target] = size;
    mockFsState.hashes[target] = hash === undefined ? shaOf(target) : hash;
    return Promise.resolve(blobResponse(size));
};
const shaOf = (blobFilePath) => blobFilePath.split('/').pop().replace(/\.bin$/, '');

describe('describeError', () => {
    it('reports the HTTP status for a ServerError whose message is [object Object]', () => {
        expect(describeError({response: {status: 500}, message: '[object Object]'})).toBe('HTTP 500');
    });
    it('uses a clean error message when present', () => {
        expect(describeError(new Error('Blob download failed with HTTP 403'))).toBe('Blob download failed with HTTP 403');
    });
    it('combines status and message when both are useful', () => {
        const e = new Error('boom');
        e.response = {status: 404};
        expect(describeError(e)).toBe('HTTP 404 boom');
    });
    it('falls back to JSON for an opaque object', () => {
        expect(describeError({code: 'X'})).toBe('{"code":"X"}');
    });
    it('handles a null error', () => {
        expect(describeError(null)).toBe('unknown error');
    });
});

describe('DownloadableContentService', () => {
    let service;
    let items;
    let statusMessageCallBack;

    beforeEach(() => {
        jest.clearAllMocks();
        mockFsState.existing = new Set();
        mockFsState.dirContents = {};
        mockFsState.sizes = {};
        mockFsState.hashes = {};
        items = [];
        statusMessageCallBack = jest.fn();

        service = new DownloadableContentService(null, null);
        service.getAllNonVoided = () => items;
        service.getServerUrl = () => 'https://server';
        service.getService = jest.fn(() => ({onModelContentSynced: jest.fn()}));

        mockDownloadWithoutAuth.mockImplementation(writesBlob(100));
        mockGet.mockResolvedValue('https://signed-url');
    });

    it('fetches modelBlobUrl with the content key, then downloads the signed URL headerless', async () => {
        items = [item()];
        const failures = await service.downloadContent(statusMessageCallBack);

        expect(failures).toEqual([]);
        expect(mockGet).toHaveBeenCalledWith('https://server/media/modelBlobUrl?key=models/abc.bin');
        expect(mockDownloadWithoutAuth).toHaveBeenCalledTimes(1);
        expect(mockDownloadWithoutAuth.mock.calls[0][0]).toBe('https://signed-url');
        expect(mockDownloadWithoutAuth.mock.calls[0][1]).toBe(blobPath('abc'));
    });

    it('does not reject when the ciphertext hash differs from the plaintext sha256', async () => {
        // An encrypted blob is ciphertext, so its bytes cannot hash to the plaintext sha256.
        // Verification there is left to the native decrypt; the file is kept.
        items = [item({needsKey: true})];
        mockGet.mockResolvedValueOnce('https://signed-url').mockResolvedValueOnce('aes-key');
        mockDownloadWithoutAuth.mockImplementation(writesBlob(100, 'a-completely-different-hash'));

        const failures = await service.downloadContent(statusMessageCallBack);

        expect(failures).toEqual([]);
        expect(fs.unlink).not.toHaveBeenCalled();
        expect(mockFsState.existing.has(blobPath('abc'))).toBe(true);
    });

    it('skips download when the blob is already cached (cache hit)', async () => {
        items = [item()];
        mockFsState.existing.add(blobPath('abc'));

        const failures = await service.downloadContent(statusMessageCallBack);

        expect(failures).toEqual([]);
        expect(mockDownloadWithoutAuth).not.toHaveBeenCalled();
        expect(mockGet).not.toHaveBeenCalled();
    });

    it('re-downloads and deletes the superseded blob when sha256 changes', async () => {
        items = [item({contentKey: 'models/new.bin', sha256: 'new'})];
        mockFsState.existing.add(MODELS_DIR);
        mockFsState.existing.add(blobPath('old'));
        mockFsState.dirContents[MODELS_DIR] = [{name: 'old.bin', path: blobPath('old')}];

        const failures = await service.downloadContent(statusMessageCallBack);

        expect(failures).toEqual([]);
        expect(mockDownloadWithoutAuth).toHaveBeenCalledTimes(1);
        expect(fs.unlink).toHaveBeenCalledWith(blobPath('old'));
        expect(mockFsState.existing.has(blobPath('old'))).toBe(false);
    });

    it('rejects a truncated download (size < Content-Length) and unlinks the partial', async () => {
        items = [item()];
        mockDownloadWithoutAuth.mockImplementation((url, target) => {
            mockFsState.existing.add(target);
            mockFsState.sizes[target] = 40;
            return Promise.resolve(blobResponse(100));
        });

        const failures = await service.downloadContent(statusMessageCallBack);

        expect(failures).toEqual(['edge-model']);
        expect(fs.unlink).toHaveBeenCalledWith(blobPath('abc'));
        expect(mockFsState.existing.has(blobPath('abc'))).toBe(false);
        expect(statusMessageCallBack).toHaveBeenCalledWith('contentNotDownloaded');
    });

    it('rejects a non-2xx response (e.g. expired signed URL → 403 error body) and unlinks the partial', async () => {
        items = [item()];
        // RNFetchBlob resolves even on HTTP errors; the small error body would otherwise pass
        // the size check and be cached as the blob.
        mockDownloadWithoutAuth.mockImplementation((url, target) => {
            mockFsState.existing.add(target);
            mockFsState.sizes[target] = 120;  // non-empty XML error body
            return Promise.resolve(blobResponse(120, 403));
        });

        const failures = await service.downloadContent(statusMessageCallBack);

        expect(failures).toEqual(['edge-model']);
        expect(fs.unlink).toHaveBeenCalledWith(blobPath('abc'));
        expect(mockFsState.existing.has(blobPath('abc'))).toBe(false);
        expect(statusMessageCallBack).toHaveBeenCalledWith('contentNotDownloaded');
    });

    it('rejects an empty download (zero bytes) and unlinks the partial', async () => {
        items = [item()];
        mockDownloadWithoutAuth.mockImplementation((url, target) => {
            mockFsState.existing.add(target);
            mockFsState.sizes[target] = 0;
            return Promise.resolve(blobResponse(0));
        });

        const failures = await service.downloadContent(statusMessageCallBack);

        expect(failures).toEqual(['edge-model']);
        expect(fs.unlink).toHaveBeenCalledWith(blobPath('abc'));
    });

    // Guidance images sync as unencrypted DownloadableContent rows, so the blob IS its plaintext
    // and its bytes must hash to the record's sha256. A right-sized but corrupt image would
    // otherwise pass the length check and be shown to a health worker as guidance.
    const guidanceItem = (overrides) => item({
        name: 'guidance-3-reckoner', category: 'guidanceImage',
        contentKey: 'models/def.bin', sha256: 'def', needsKey: false, ...overrides
    });

    it('keeps an unencrypted blob whose contents hash to the recorded sha256', async () => {
        items = [guidanceItem()];

        const failures = await service.downloadContent(statusMessageCallBack);

        expect(failures).toEqual([]);
        expect(fs.unlink).not.toHaveBeenCalled();
        expect(mockFsState.existing.has(blobPath('def'))).toBe(true);
    });

    it('accepts a hash that differs only in case', async () => {
        items = [guidanceItem({sha256: 'DEF'})];
        mockDownloadWithoutAuth.mockImplementation(writesBlob(100, 'def'));

        expect(await service.downloadContent(statusMessageCallBack)).toEqual([]);
    });

    it('deletes a right-sized but corrupt unencrypted blob and counts it a failure', async () => {
        items = [guidanceItem()];
        mockDownloadWithoutAuth.mockImplementation(writesBlob(100, 'corrupted-bytes'));

        const failures = await service.downloadContent(statusMessageCallBack);

        expect(failures).toEqual(['guidance-3-reckoner']);
        expect(fs.unlink).toHaveBeenCalledWith(blobPath('def'));
        expect(mockFsState.existing.has(blobPath('def'))).toBe(false);
        expect(statusMessageCallBack).toHaveBeenCalledWith('contentNotDownloaded');
    });

    it('finishes the sync and downloads the other images when one is corrupt', async () => {
        items = [
            guidanceItem({name: 'guidance-1', contentKey: 'models/one.bin', sha256: 'one'}),
            guidanceItem({name: 'guidance-2', contentKey: 'models/two.bin', sha256: 'two'})
        ];
        mockDownloadWithoutAuth.mockImplementation((url, target) =>
            (target === blobPath('one') ? writesBlob(100, 'garbage') : writesBlob(100))(url, target));

        const failures = await service.downloadContent(statusMessageCallBack);

        expect(failures).toEqual(['guidance-1']);
        expect(mockFsState.existing.has(blobPath('one'))).toBe(false);
        expect(mockFsState.existing.has(blobPath('two'))).toBe(true);
    });

    it('re-fetches a rejected image on the next sync, since nothing was left at the final path', async () => {
        items = [guidanceItem()];
        mockDownloadWithoutAuth.mockImplementation(writesBlob(100, 'corrupted-bytes'));
        await service.downloadContent(statusMessageCallBack);

        mockDownloadWithoutAuth.mockImplementation(writesBlob(100));
        const failures = await service.downloadContent(statusMessageCallBack);

        expect(failures).toEqual([]);
        expect(mockFsState.existing.has(blobPath('def'))).toBe(true);
    });

    it('does not re-hash an image that is already on the device', async () => {
        items = [guidanceItem()];
        mockFsState.existing.add(blobPath('def'));

        expect(await service.downloadContent(statusMessageCallBack)).toEqual([]);
        expect(mockDownloadWithoutAuth).not.toHaveBeenCalled();
        expect(fs.hash).not.toHaveBeenCalled();
    });

    it('accepts a download with no Content-Length header when the file is non-empty', async () => {
        items = [item()];
        mockDownloadWithoutAuth.mockImplementation((url, target) => {
            mockFsState.existing.add(target);
            mockFsState.sizes[target] = 100;
            mockFsState.hashes[target] = shaOf(target);
            return Promise.resolve({respInfo: {status: 200, headers: {}}});
        });

        const failures = await service.downloadContent(statusMessageCallBack);

        expect(failures).toEqual([]);
        expect(fs.unlink).not.toHaveBeenCalled();
    });

    it('fetches the AES key into private storage atomically when needsKey is true', async () => {
        items = [item({needsKey: true})];
        mockGet.mockImplementation((url) =>
            url.includes('modelKey') ? Promise.resolve('base64-key') : Promise.resolve('https://signed-url'));

        const failures = await service.downloadContent(statusMessageCallBack);

        expect(failures).toEqual([]);
        expect(mockGet).toHaveBeenCalledWith('https://server/media/modelKey?sha256=abc');
        expect(fs.writeFile).toHaveBeenCalledWith(`${keyPath('abc')}.tmp`, 'base64-key', 'utf8');
        expect(fs.moveFile).toHaveBeenCalledWith(`${keyPath('abc')}.tmp`, keyPath('abc'));
        // private internal storage, not external
        expect(keyPath('abc').startsWith('/mock/private')).toBe(true);
    });

    it('does not re-fetch the key when it is already cached (cache hit, needsKey)', async () => {
        items = [item({needsKey: true})];
        mockFsState.existing.add(blobPath('abc'));
        mockFsState.existing.add(keyPath('abc'));

        const failures = await service.downloadContent(statusMessageCallBack);

        expect(failures).toEqual([]);
        expect(mockGet).not.toHaveBeenCalled();
        expect(fs.writeFile).not.toHaveBeenCalled();
    });

    it('surfaces a download failure without throwing (non-fatal)', async () => {
        items = [item()];
        mockDownloadWithoutAuth.mockRejectedValueOnce(new Error('network down'));

        const failures = await service.downloadContent(statusMessageCallBack);

        expect(failures).toEqual(['edge-model']);
        expect(statusMessageCallBack).toHaveBeenCalledWith('contentNotDownloaded');
    });

    it('does not write a key and surfaces failure when the key fetch fails (e.g. 404)', async () => {
        items = [item({needsKey: true})];
        mockGet.mockImplementation((url) =>
            url.includes('modelKey') ? Promise.reject(new Error('Http 404')) : Promise.resolve('https://signed-url'));

        const failures = await service.downloadContent(statusMessageCallBack);

        expect(failures).toEqual(['edge-model']);
        expect(fs.writeFile).not.toHaveBeenCalled();
        expect(fs.moveFile).not.toHaveBeenCalled();
        expect(statusMessageCallBack).toHaveBeenCalledWith('contentNotDownloaded');
    });

    it('does not write a key when the key body is empty', async () => {
        items = [item({needsKey: true})];
        mockGet.mockImplementation((url) =>
            url.includes('modelKey') ? Promise.resolve('') : Promise.resolve('https://signed-url'));

        const failures = await service.downloadContent(statusMessageCallBack);

        expect(failures).toEqual(['edge-model']);
        expect(fs.writeFile).not.toHaveBeenCalled();
    });

    it('is a no-op for an item with no contentKey', async () => {
        items = [item({contentKey: null, sha256: null})];

        const failures = await service.downloadContent(statusMessageCallBack);

        expect(failures).toEqual([]);
        expect(mockGet).not.toHaveBeenCalled();
        expect(mockDownloadWithoutAuth).not.toHaveBeenCalled();
        expect(statusMessageCallBack).not.toHaveBeenCalled();
    });

    it('does nothing when there are no downloadable-content items', async () => {
        items = [];
        const failures = await service.downloadContent(statusMessageCallBack);
        expect(failures).toEqual([]);
        expect(mockDownloadWithoutAuth).not.toHaveBeenCalled();
    });
});


// --- where a blob lives ----------------------------------------------------
// The path mirrors the row's contentKey under the content root, so the device layout matches the
// bucket and each namespace keeps its own extension.

describe('contentBlobPath', () => {
    it('puts a model exactly where it has always been, so an upgrade does not re-download it', () => {
        expect(contentBlobPath({contentKey: `models/${'a'.repeat(64)}.bin`}))
            .toBe(`${MODELS_DIR}/${'a'.repeat(64)}.bin`);
    });

    it('puts a guidance picture under its own namespace, keeping its image extension', () => {
        expect(contentBlobPath({contentKey: 'guidance/abc.png'})).toBe('/mock/external/Avni/guidance/abc.png');
        expect(contentBlobPath({contentKey: 'guidance/abc.jpg'})).toBe('/mock/external/Avni/guidance/abc.jpg');
    });

    it('refuses a key that would escape the namespaces this service owns', () => {
        // contentKey arrives from the server and the app writes a file where it says, so a key that
        // walks out of a managed directory must never be followed.
        ['photos/abc.png', '../secrets/abc.bin', 'models/nested/abc.bin', 'abc.bin', 'models/', '', null]
            .forEach(contentKey => {
                expect(isManagedContentKey(contentKey)).toBe(false);
                expect(() => contentBlobPath({contentKey})).toThrow(/unmanaged content key/);
            });
    });

    it('recognises the two namespaces it does own', () => {
        expect(isManagedContentKey('models/abc.bin')).toBe(true);
        expect(isManagedContentKey('guidance/abc.png')).toBe(true);
    });
});

describe('cleanup across namespaces', () => {
    let service;
    let items;

    beforeEach(() => {
        jest.clearAllMocks();
        mockFsState.existing = new Set();
        mockFsState.dirContents = {};
        mockFsState.sizes = {};
        mockFsState.hashes = {};
        items = [];
        service = new DownloadableContentService(null, null);
        service.getAllNonVoided = () => items;
        service.getServerUrl = () => 'https://server';
        service.getService = jest.fn(() => ({onModelContentSynced: jest.fn()}));
        mockDownloadWithoutAuth.mockImplementation(writesBlob(100));
        mockGet.mockResolvedValue('https://signed-url');
    });

    const GUIDANCE_DIR = '/mock/external/Avni/guidance';

    it('removes a guidance picture whose row is gone, and keeps the live one', async () => {
        items = [item({name: 'live', category: 'guidanceImage', contentKey: 'guidance/live.png', sha256: 'live'})];
        mockFsState.existing.add(GUIDANCE_DIR);
        mockFsState.existing.add(`${GUIDANCE_DIR}/live.png`);
        mockFsState.existing.add(`${GUIDANCE_DIR}/stale.png`);
        mockFsState.dirContents[GUIDANCE_DIR] = [
            {name: 'live.png', path: `${GUIDANCE_DIR}/live.png`},
            {name: 'stale.png', path: `${GUIDANCE_DIR}/stale.png`}
        ];

        await service.downloadContent(statusMessageCallBackFor());

        expect(mockFsState.existing.has(`${GUIDANCE_DIR}/live.png`)).toBe(true);
        expect(mockFsState.existing.has(`${GUIDANCE_DIR}/stale.png`)).toBe(false);
    });

    it('never sweeps a directory outside its own namespaces', async () => {
        // The content root also holds the user's photographs; a content sweep must not reach them.
        const IMAGES_DIR = '/mock/external/Avni/media/images';
        items = [item()];
        mockFsState.existing.add(IMAGES_DIR);
        mockFsState.existing.add(`${IMAGES_DIR}/a-users-photo.jpg`);
        mockFsState.dirContents[IMAGES_DIR] = [
            {name: 'a-users-photo.jpg', path: `${IMAGES_DIR}/a-users-photo.jpg`}
        ];

        await service.downloadContent(statusMessageCallBackFor());

        expect(mockFsState.existing.has(`${IMAGES_DIR}/a-users-photo.jpg`)).toBe(true);
        expect(fs.readDir).not.toHaveBeenCalledWith(IMAGES_DIR);
    });

    it('sweeps nothing when a content key cannot be resolved to a path', async () => {
        // An unparseable key leaves its blob out of the live set, so a sweep would delete a file
        // that is still in use — and downloadItem, failing on the same key, could not fetch it back.
        items = [
            item({name: 'good', contentKey: 'models/good.bin', sha256: 'good'}),
            item({name: 'odd', contentKey: 'edge-models/odd.bin', sha256: 'odd'})
        ];
        mockFsState.existing.add(MODELS_DIR);
        mockFsState.existing.add(blobPath('good'));
        mockFsState.existing.add(`${MODELS_DIR}/superseded.bin`);
        mockFsState.dirContents[MODELS_DIR] = [
            {name: 'good.bin', path: blobPath('good')},
            {name: 'superseded.bin', path: `${MODELS_DIR}/superseded.bin`}
        ];

        const failures = await service.downloadContent(statusMessageCallBackFor());

        expect(failures).toEqual(['odd']);
        expect(mockFsState.existing.has(blobPath('good'))).toBe(true);
        expect(mockFsState.existing.has(`${MODELS_DIR}/superseded.bin`)).toBe(true);
    });

    it('never unlinks a directory entry while sweeping', async () => {
        items = [item({name: 'live', contentKey: 'models/live.bin', sha256: 'live'})];
        mockFsState.existing.add(MODELS_DIR);
        mockFsState.existing.add(blobPath('live'));
        mockFsState.existing.add(`${MODELS_DIR}/a-subdirectory`);
        mockFsState.dirContents[MODELS_DIR] = [
            {name: 'live.bin', path: blobPath('live'), isFile: () => true},
            {name: 'a-subdirectory', path: `${MODELS_DIR}/a-subdirectory`, isFile: () => false}
        ];

        await service.downloadContent(statusMessageCallBackFor());

        expect(mockFsState.existing.has(`${MODELS_DIR}/a-subdirectory`)).toBe(true);
    });

    it('leaves a model alone while cleaning guidance, and the other way round', async () => {
        items = [
            item({name: 'model', contentKey: 'models/keep.bin', sha256: 'keep'}),
            item({name: 'picture', category: 'guidanceImage', contentKey: 'guidance/keep.png', sha256: 'keep-png'})
        ];
        mockFsState.existing.add(MODELS_DIR);
        mockFsState.existing.add(GUIDANCE_DIR);
        mockFsState.existing.add(`${MODELS_DIR}/keep.bin`);
        mockFsState.existing.add(`${GUIDANCE_DIR}/keep.png`);
        mockFsState.dirContents[MODELS_DIR] = [{name: 'keep.bin', path: `${MODELS_DIR}/keep.bin`}];
        mockFsState.dirContents[GUIDANCE_DIR] = [{name: 'keep.png', path: `${GUIDANCE_DIR}/keep.png`}];

        await service.downloadContent(statusMessageCallBackFor());

        expect(mockFsState.existing.has(`${MODELS_DIR}/keep.bin`)).toBe(true);
        expect(mockFsState.existing.has(`${GUIDANCE_DIR}/keep.png`)).toBe(true);
    });
});

const statusMessageCallBackFor = () => jest.fn();
