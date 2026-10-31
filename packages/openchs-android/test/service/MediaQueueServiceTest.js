jest.mock('../../src/framework/http/requests', () => ({get: (...args) => mockGet(...args)}));

const mockGet = jest.fn();

const MediaQueueService = require('../../src/service/MediaQueueService').default;

function mediaQueueServiceWithGet(onGet) {
    mockGet.mockImplementation((url) => {
        onGet(url);
        return Promise.resolve('https://s3/put');
    });
    const settingsService = {getSettings: () => ({serverURL: 'https://server'})};
    const context = {getService: () => settingsService};
    return new MediaQueueService({}, context);
}

describe('MediaQueueService.getDumpUploadUrl', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('sends a SQLite catchment dump to the fast sync upload route', () => {
        const calls = [];
        const service = mediaQueueServiceWithGet(url => calls.push(url));
        service.getDumpUploadUrl(MediaQueueService.DumpType.CatchmentSqlite, 'ignored.db');
        expect(calls).toHaveLength(1);
        expect(calls[0]).toMatch(/\/media\/fastSyncUpload$/);
    });

    it('still sends a Realm catchment dump to the realm backup route', () => {
        const calls = [];
        const service = mediaQueueServiceWithGet(url => calls.push(url));
        service.getDumpUploadUrl(MediaQueueService.DumpType.Catchment, 'ignored.realm');
        expect(calls[0]).toMatch(/\/media\/mobileDatabaseBackupUrl\/upload$/);
    });
});

describe('MediaQueueService.uploadToUrl stall', () => {
    const RNFetchBlob = require('react-native-blob-util');
    const {UPLOAD_STALLED_MESSAGE} = require('../../src/framework/errorHandling/ExpectedTransientNetworkError');

    // A task that never reports progress and rejects with the library's bare "canceled" when cancelled.
    function hangingUploadTask() {
        let rejectTask;
        const task = new Promise((resolve, reject) => { rejectTask = reject; });
        task.uploadProgress = () => {};
        task.cancel = () => rejectTask(new Error('canceled'));
        return task;
    }

    beforeEach(() => {
        jest.useFakeTimers();
        RNFetchBlob.wrap = (path) => path;
    });
    afterEach(() => jest.useRealTimers());

    const mediaQueueItem = {fileName: 'a.jpg', getDisplayText: () => 'a.jpg'};

    it('rejects with the stall message when the app cancels an upload making no progress', async () => {
        const task = hangingUploadTask();
        RNFetchBlob.fetch = () => task;
        const service = mediaQueueServiceWithGet(() => {});
        service.getAbsoluteFileName = () => '/x/a.jpg';
        const result = service.uploadToUrl('https://s3/put', mediaQueueItem);
        jest.advanceTimersByTime(60000);
        await expect(result).rejects.toThrow(UPLOAD_STALLED_MESSAGE);
    });

    it('passes on a cancel the app did not make unchanged', async () => {
        const task = hangingUploadTask();
        RNFetchBlob.fetch = () => task;
        const service = mediaQueueServiceWithGet(() => {});
        service.getAbsoluteFileName = () => '/x/a.jpg';
        const result = service.uploadToUrl('https://s3/put', mediaQueueItem);
        task.cancel();
        await expect(result).rejects.toThrow(/^canceled$/);
    });

    it('names the same duration as the timeout', () => {
        expect(UPLOAD_STALLED_MESSAGE).toBe(`Upload stalled - no progress for ${require('../../src/service/MediaQueueService').UPLOAD_PROGRESS_TIMEOUT_MS / 1000} seconds`);
    });
});
