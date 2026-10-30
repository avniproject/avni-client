jest.mock('../../src/framework/http/requests', () => ({
    get: (...args) => mockGet(...args),
    post: (...args) => mockPost(...args),
    isHttpRequestSuccessful: (status) => [200, 201].indexOf(status) > -1,
}));
jest.mock('../../src/framework/errorHandling/ErrorUtil', () => ({notifyBugsnag: jest.fn()}));

const mockGet = jest.fn();
const mockPost = jest.fn();

const _ = require('lodash');
const General = require('../../src/utility/General').default;
const MediaQueueService = require('../../src/service/MediaQueueService').default;
const MediaUploadError = require('../../src/framework/errorHandling/MediaUploadError').default;
const AuthenticationError = require('../../src/service/AuthenticationError').default;
const ServerError = require('../../src/service/ServerError').default;

const settingsService = {getSettings: () => ({serverURL: 'https://server'})};
const context = {getService: () => settingsService};

function mediaQueueServiceWithGet(onGet) {
    mockGet.mockImplementation((url) => {
        onGet(url);
        return Promise.resolve('https://s3/put');
    });
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

function queueItems(count, prefix = 'img') {
    return _.range(count).map((i) => {
        const fileName = `${prefix}${i}.jpg`;
        return {uuid: `uuid-${fileName}`, fileName, entityName: 'Individual', entityUUID: 'e1', clone() { return this; }, getDisplayText: () => fileName};
    });
}

// The server answers a POST /media/uploadUrls with one URL per name; issue is the counter so a fresh URL is distinguishable.
function answerEveryBatch() {
    let issue = 0;
    mockPost.mockImplementation((url, fileNames) => {
        issue += 1;
        const urls = _.fromPairs(fileNames.map((name) => [name, `https://s3/${name}?issue=${issue}`]));
        return Promise.resolve({json: () => Promise.resolve(urls)});
    });
}

function refuseBatch(error) {
    mockPost.mockImplementation(() => Promise.reject(error));
}

function uploadStatusError(status, body = '') {
    const error = new Error(`Media upload failed. HTTP Status:${status}.`);
    error.httpStatus = status;
    error.responseBody = body;
    return error;
}

function uploadingService(items, {missing = [], uploadStatusFor = () => 200} = {}) {
    const service = new MediaQueueService({}, context);
    service.findAll = () => items;
    service.mediaExists = (item) => Promise.resolve(!_.includes(missing, item.fileName));
    service.uploadToUrl = jest.fn((url, item) => {
        const answer = uploadStatusFor(item, url);
        const {status, body} = _.isObject(answer) ? answer : {status: answer};
        return status === 200 ? Promise.resolve() : Promise.reject(uploadStatusError(status, body));
    });
    service.replaceObservation = jest.fn(() => true);
    service.popItem = jest.fn();
    return service;
}

const requestedNames = () => mockPost.mock.calls.map(([, fileNames]) => fileNames);
const uploadedNames = (service) => service.uploadToUrl.mock.calls.map(([, item]) => item.fileName);
const poppedNames = (service) => service.popItem.mock.calls.map(([item]) => item.fileName);

describe('MediaQueueService.uploadMedia: upload URLs fetched in batches', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockGet.mockImplementation(() => Promise.reject(new Error('GET /media/uploadUrl must not be called')));
    });

    it('asks for 50 URLs at a time and uploads every item with the URL it was given', async () => {
        answerEveryBatch();
        const items = queueItems(120);
        const service = uploadingService(items);

        await service.uploadMedia();

        expect(mockPost.mock.calls.map(([url]) => url)).toEqual(_.times(3, () => 'https://server/media/uploadUrls'));
        expect(requestedNames().map((names) => names.length)).toEqual([50, 50, 20]);
        expect(_.flatten(requestedNames())).toEqual(items.map((item) => item.fileName));
        expect(uploadedNames(service)).toEqual(items.map((item) => item.fileName));
        service.uploadToUrl.mock.calls.forEach(([url, item]) => expect(url).toBe(`https://s3/${item.fileName}?issue=${Math.floor(_.indexOf(items, item) / 50) + 1}`));
        expect(poppedNames(service)).toEqual(items.map((item) => item.fileName));
        expect(mockGet).not.toHaveBeenCalled();
    });

    it('fetches the URLs of a group before uploading any of it, and the next group only after the first is done', async () => {
        const events = [];
        const service = uploadingService(queueItems(60));
        mockPost.mockImplementation((url, fileNames) => {
            events.push(`urls ${fileNames.length}`);
            return Promise.resolve({json: () => Promise.resolve(_.fromPairs(fileNames.map((n) => [n, `https://s3/${n}`])))});
        });
        service.uploadToUrl = jest.fn((url, item) => { events.push(`put ${item.fileName}`); return Promise.resolve(); });

        await service.uploadMedia();

        expect(events[0]).toBe('urls 50');
        expect(events.slice(1, 51)).toEqual(queueItems(50).map((i) => `put ${i.fileName}`));
        expect(events[51]).toBe('urls 10');
        expect(events).toHaveLength(62);
    });

    it('asks for no URL for a file that is missing on the phone, and leaves its item in the queue', async () => {
        answerEveryBatch();
        const items = queueItems(4);
        const service = uploadingService(items, {missing: ['img1.jpg', 'img3.jpg']});

        await service.uploadMedia();

        expect(requestedNames()).toEqual([['img0.jpg', 'img2.jpg']]);
        expect(uploadedNames(service)).toEqual(['img0.jpg', 'img2.jpg']);
        expect(poppedNames(service)).toEqual(['img0.jpg', 'img2.jpg']);
    });

    it('skips a file removed after the queue was checked, and carries on with the rest', async () => {
        answerEveryBatch();
        const items = queueItems(3);
        const service = uploadingService(items);
        const checks = {};
        service.mediaExists = (item) => {
            checks[item.fileName] = (checks[item.fileName] || 0) + 1;
            return Promise.resolve(!(item.fileName === 'img1.jpg' && checks[item.fileName] > 1));
        };

        await service.uploadMedia();

        expect(requestedNames()).toEqual([['img0.jpg', 'img1.jpg', 'img2.jpg']]);
        expect(uploadedNames(service)).toEqual(['img0.jpg', 'img2.jpg']);
        expect(poppedNames(service)).toEqual(['img0.jpg', 'img2.jpg']);
    });

    it('makes one request when everything is missing: none', async () => {
        answerEveryBatch();
        const service = uploadingService(queueItems(2), {missing: ['img0.jpg', 'img1.jpg']});

        await service.uploadMedia();

        expect(mockPost).not.toHaveBeenCalled();
        expect(service.uploadToUrl).not.toHaveBeenCalled();
    });

    it('reports progress against every queued item, counting a missing file as done', async () => {
        answerEveryBatch();
        const messages = [];
        const service = uploadingService(queueItems(3), {missing: ['img0.jpg']});

        await service.uploadMedia((message) => messages.push(message));

        expect(messages.map((m) => m.match(/\((\d+)\/(\d+)\)$/).slice(1))).toEqual([['1', '3'], ['2', '3']]);
    });

    it('checks the files of a group only when it reaches that group', async () => {
        const events = [];
        const service = uploadingService(queueItems(60));
        answerEveryBatch();
        service.mediaExists = (item) => { events.push(`exists ${item.fileName}`); return Promise.resolve(true); };
        service.uploadToUrl = jest.fn((url, item) => { events.push(`put ${item.fileName}`); return Promise.resolve(); });

        await service.uploadMedia();

        const firstCheckOfSecondGroup = events.indexOf('exists img50.jpg');
        expect(events.indexOf('put img49.jpg')).toBeLessThan(firstCheckOfSecondGroup);
    });

    it('writes a failed URL request to the device log', async () => {
        const logError = jest.spyOn(General, 'logError').mockImplementation(() => {});
        const failure = new ServerError({status: 500, text: () => Promise.resolve('')});
        refuseBatch(failure);

        await uploadingService(queueItems(1)).uploadMedia().catch(() => {});

        expect(logError).toHaveBeenCalledWith('MediaQueueService', failure);
        logError.mockRestore();
    });

    it('a refused batch fails every item in the group as an upload failure, with no per-file fallback', async () => {
        const items = queueItems(70);
        const service = uploadingService(items);
        let calls = 0;
        mockPost.mockImplementation((url, fileNames) => {
            calls += 1;
            if (calls === 2) return Promise.reject(new ServerError({status: 500, text: () => Promise.resolve('')}));
            return Promise.resolve({json: () => Promise.resolve(_.fromPairs(fileNames.map((n) => [n, `https://s3/${n}`])))});
        });

        let error;
        await service.uploadMedia().catch((e) => error = e);

        expect(error).toBeInstanceOf(MediaUploadError);
        expect(error.originalError).toBeInstanceOf(ServerError);
        expect(uploadedNames(service)).toEqual(items.slice(0, 50).map((i) => i.fileName));
        expect(poppedNames(service)).toEqual(items.slice(0, 50).map((i) => i.fileName));
        expect(mockGet).not.toHaveBeenCalled();
        expect(mockPost).toHaveBeenCalledTimes(2);
    });

    it('a 400 from the server is a failure like any other, not a reason to retry', async () => {
        refuseBatch(new ServerError({status: 400, text: () => Promise.resolve('At most 50 file names per request')}));
        const service = uploadingService(queueItems(3));

        let error;
        await service.uploadMedia().catch((e) => error = e);

        expect(error).toBeInstanceOf(MediaUploadError);
        expect(mockPost).toHaveBeenCalledTimes(1);
        expect(service.uploadToUrl).not.toHaveBeenCalled();
        expect(mockGet).not.toHaveBeenCalled();
    });

    it('lets an authentication failure on the batch request through unwrapped, so login is asked for', async () => {
        refuseBatch(new AuthenticationError('Http 401', 'Http 401'));
        const service = uploadingService(queueItems(3));

        let error;
        await service.uploadMedia().catch((e) => error = e);

        expect(error).toBeInstanceOf(AuthenticationError);
        expect(error).not.toBeInstanceOf(MediaUploadError);
    });

    it('fails the item, and so the upload, when the answer lacks a requested name', async () => {
        mockPost.mockImplementation((url, fileNames) =>
            Promise.resolve({json: () => Promise.resolve(_.fromPairs(fileNames.slice(1).map((n) => [n, `https://s3/${n}`])))}));
        const service = uploadingService(queueItems(2));

        let error;
        await service.uploadMedia().catch((e) => error = e);

        expect(error).toBeInstanceOf(MediaUploadError);
        expect(error.message).toContain('img0.jpg');
        expect(service.uploadToUrl).not.toHaveBeenCalled();
    });
});

describe('MediaQueueService.uploadMedia: an upload refused with 403 gets one fresh URL', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockGet.mockImplementation(() => Promise.reject(new Error('GET /media/uploadUrl must not be called')));
    });

    it('asks for that one file again, uploads to the fresh URL and records that URL on the record', async () => {
        answerEveryBatch();
        const items = queueItems(3);
        const service = uploadingService(items, {uploadStatusFor: (item, url) => item.fileName === 'img1.jpg' && url.endsWith('issue=1') ? 403 : 200});

        await service.uploadMedia();

        expect(requestedNames()).toEqual([['img0.jpg', 'img1.jpg', 'img2.jpg'], ['img1.jpg']]);
        expect(service.uploadToUrl.mock.calls.map(([url]) => url)).toEqual([
            'https://s3/img0.jpg?issue=1', 'https://s3/img1.jpg?issue=1', 'https://s3/img1.jpg?issue=2', 'https://s3/img2.jpg?issue=1',
        ]);
        expect(service.replaceObservation.mock.calls.map(([, url]) => url)).toEqual([
            'https://s3/img0.jpg?issue=1', 'https://s3/img1.jpg?issue=2', 'https://s3/img2.jpg?issue=1',
        ]);
        expect(poppedNames(service)).toEqual(['img0.jpg', 'img1.jpg', 'img2.jpg']);
        expect(mockGet).not.toHaveBeenCalled();
    });

    it('retries once only: a second 403 fails the upload', async () => {
        answerEveryBatch();
        const service = uploadingService(queueItems(2), {uploadStatusFor: (item) => item.fileName === 'img0.jpg' ? 403 : 200});

        let error;
        await service.uploadMedia().catch((e) => error = e);

        expect(error).toBeInstanceOf(MediaUploadError);
        expect(error.originalError.httpStatus).toBe(403);
        expect(mockPost).toHaveBeenCalledTimes(2);
        expect(uploadedNames(service)).toEqual(['img0.jpg', 'img0.jpg']);
        expect(poppedNames(service)).toEqual([]);
    });

    it('treats a GCS 400 ExpiredToken as an expired URL too', async () => {
        answerEveryBatch();
        const expired = {status: 400, body: '<Error><Code>ExpiredToken</Code><Message>Invalid argument.</Message></Error>'};
        const service = uploadingService(queueItems(1), {uploadStatusFor: (item, url) => url.endsWith('issue=1') ? expired : 200});

        await service.uploadMedia();

        expect(requestedNames()).toEqual([['img0.jpg'], ['img0.jpg']]);
        expect(poppedNames(service)).toEqual(['img0.jpg']);
    });

    it('does not retry any other 400', async () => {
        answerEveryBatch();
        const service = uploadingService(queueItems(1), {uploadStatusFor: () => ({status: 400, body: '<Error><Code>InvalidArgument</Code></Error>'})});

        let error;
        await service.uploadMedia().catch((e) => error = e);

        expect(error).toBeInstanceOf(MediaUploadError);
        expect(mockPost).toHaveBeenCalledTimes(1);
    });

    it('does not ask for a fresh URL on any other upload failure', async () => {
        answerEveryBatch();
        const service = uploadingService(queueItems(2), {uploadStatusFor: (item) => item.fileName === 'img0.jpg' ? 500 : 200});

        let error;
        await service.uploadMedia().catch((e) => error = e);

        expect(error).toBeInstanceOf(MediaUploadError);
        expect(mockPost).toHaveBeenCalledTimes(1);
        expect(uploadedNames(service)).toEqual(['img0.jpg']);
    });
});

describe('MediaQueueService.uploadMedia: URLs close to expiry are asked for again before uploading', () => {
    let now;
    beforeEach(() => {
        jest.clearAllMocks();
        mockGet.mockImplementation(() => Promise.reject(new Error('GET /media/uploadUrl must not be called')));
        now = 1_000_000;
        jest.spyOn(Date, 'now').mockImplementation(() => now);
    });
    afterEach(() => jest.restoreAllMocks());

    function answerWithLifetime(param = 'X-Amz-Expires', seconds = 600) {
        let issue = 0;
        mockPost.mockImplementation((url, fileNames) => {
            issue += 1;
            const urls = _.fromPairs(fileNames.map((name) => [name, `https://s3/${name}?issue=${issue}&${param}=${seconds}`]));
            return Promise.resolve({json: () => Promise.resolve(urls)});
        });
    }

    function minutesPerUpload(service, minutes) {
        service.uploadToUrl = jest.fn(() => { now += minutes * 60 * 1000; return Promise.resolve(); });
    }

    it('asks again, in one request, for the rest of the group once its URLs are within the margin of expiry', async () => {
        answerWithLifetime();
        const items = queueItems(5);
        const service = uploadingService(items);
        minutesPerUpload(service, 3);

        await service.uploadMedia();

        expect(requestedNames()).toEqual([
            ['img0.jpg', 'img1.jpg', 'img2.jpg', 'img3.jpg', 'img4.jpg'],
            ['img3.jpg', 'img4.jpg'],
        ]);
        expect(service.uploadToUrl.mock.calls.map(([url]) => url.split('&')[0])).toEqual([
            'https://s3/img0.jpg?issue=1', 'https://s3/img1.jpg?issue=1', 'https://s3/img2.jpg?issue=1',
            'https://s3/img3.jpg?issue=2', 'https://s3/img4.jpg?issue=2',
        ]);
        expect(poppedNames(service)).toEqual(items.map((item) => item.fileName));
    });

    it('reads the lifetime of a URL Google signed itself too', async () => {
        answerWithLifetime('X-Goog-Expires');
        const service = uploadingService(queueItems(5));
        minutesPerUpload(service, 3);

        await service.uploadMedia();

        expect(mockPost).toHaveBeenCalledTimes(2);
    });

    it('asks only once per group while uploads are quick', async () => {
        answerWithLifetime();
        const service = uploadingService(queueItems(50));
        minutesPerUpload(service, 0.1);

        await service.uploadMedia();

        expect(mockPost).toHaveBeenCalledTimes(1);
    });

    it('a URL whose lifetime is shorter than the margin is not near expiry on arrival', async () => {
        answerWithLifetime('X-Amz-Expires', 60);
        const service = uploadingService(queueItems(10));
        minutesPerUpload(service, 0.01);

        await service.uploadMedia();

        expect(mockPost).toHaveBeenCalledTimes(1);
    });

    it('times a URL from when it was asked for, not from when the answer arrived', async () => {
        let issue = 0;
        mockPost.mockImplementation((url, fileNames) => {
            issue += 1;
            now += 5 * 60 * 1000;
            const urls = _.fromPairs(fileNames.map((name) => [name, `https://s3/${name}?issue=${issue}&X-Amz-Expires=600`]));
            return Promise.resolve({json: () => Promise.resolve(urls)});
        });
        const service = uploadingService(queueItems(3));
        minutesPerUpload(service, 2);

        await service.uploadMedia();

        expect(requestedNames()).toEqual([['img0.jpg', 'img1.jpg', 'img2.jpg'], ['img2.jpg']]);
    });

    it('leaves a URL with no lifetime to the 403 retry', async () => {
        answerEveryBatch();
        const service = uploadingService(queueItems(5));
        minutesPerUpload(service, 3);

        await service.uploadMedia();

        expect(mockPost).toHaveBeenCalledTimes(1);
    });
});

describe('MediaQueueService.uploadToUrl: what a refused upload keeps of the answer', () => {
    const RNFetchBlob = require('react-native-blob-util');

    function storageAnswers(status, body) {
        const text = jest.fn(() => body);
        RNFetchBlob.wrap = (path) => path;
        RNFetchBlob.fetch = () => {
            const task = Promise.resolve({info: () => ({status}), text});
            task.uploadProgress = () => {};
            task.cancel = () => {};
            return task;
        };
        return text;
    }

    const item = {fileName: 'img0.jpg', type: 'Image', getDisplayText: () => 'img0.jpg'};
    const refusal = (service) => service.uploadToUrl('https://s3/img0.jpg', item).catch((e) => e);

    it('keeps the start of a 400 answer', async () => {
        storageAnswers(400, '<Error><Code>ExpiredToken</Code></Error>' + 'x'.repeat(1000));

        const error = await refusal(new MediaQueueService({}, context));

        expect(error.httpStatus).toBe(400);
        expect(error.responseBody).toMatch(/^<Error><Code>ExpiredToken<\/Code>/);
        expect(error.responseBody).toHaveLength(500);
    });

    it('does not read the answer to any other refusal', async () => {
        const text = storageAnswers(502, '<html>captive portal</html>');

        const error = await refusal(new MediaQueueService({}, context));

        expect(error.httpStatus).toBe(502);
        expect(error.responseBody).toBeUndefined();
        expect(text).not.toHaveBeenCalled();
    });
});
