jest.mock('../../src/framework/bean/Service', () => () => (target) => target);

const mockGet = jest.fn();
jest.mock('../../src/framework/http/requests', () => ({get: (...args) => mockGet(...args)}));

const mockDownloadWithoutAuth = jest.fn();
jest.mock('../../src/service/AuthAwareDownload', () => ({downloadWithoutAuth: (...args) => mockDownloadWithoutAuth(...args)}));

const mockFsState = {existing: new Set(), dirContents: {}, sizes: {}};
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
}));

jest.mock('react-native', () => ({NativeModules: {}}));

import fs from 'react-native-fs';
import DownloadableContentService, {describeError} from '../../src/service/DownloadableContentService';
import FileSystem from '../../src/model/FileSystem';

const MODELS_DIR = FileSystem.getModelsDir();
const KEYS_DIR = FileSystem.getModelKeysDir();
const blobPath = (sha) => `${MODELS_DIR}/${sha}.bin`;
const keyPath = (sha) => `${KEYS_DIR}/${sha}.key`;

const item = (overrides) => ({
    name: 'edge-model', category: 'edgeModel',
    contentKey: 'models/abc.bin', sha256: 'abc', needsKey: false, voided: false, ...overrides
});

// Simulates a successful blob download of `size` bytes to the target path.
const writesBlob = (size) => (url, target) => {
    mockFsState.existing.add(target);
    mockFsState.sizes[target] = size;
    return Promise.resolve(blobResponse(size));
};

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
        // sha256 verification of the ciphertext is intentionally not performed; the file is kept.
        items = [item()];
        mockDownloadWithoutAuth.mockImplementation(writesBlob(100));

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

    it('accepts a download with no Content-Length header when the file is non-empty', async () => {
        items = [item()];
        mockDownloadWithoutAuth.mockImplementation((url, target) => {
            mockFsState.existing.add(target);
            mockFsState.sizes[target] = 100;
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
