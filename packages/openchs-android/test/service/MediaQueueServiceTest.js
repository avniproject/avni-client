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
