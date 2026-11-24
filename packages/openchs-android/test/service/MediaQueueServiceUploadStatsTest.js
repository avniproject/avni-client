jest.mock('../../src/framework/http/requests', () => ({get: jest.fn()}));
const mockStat = jest.fn();
jest.mock('react-native-fs', () => ({stat: (...args) => mockStat(...args), DocumentDirectoryPath: '/mock'}));

const MediaQueueService = require('../../src/service/MediaQueueService').default;

const newService = () => {
    const service = new MediaQueueService({}, {getService: () => ({})});
    service.resetUploadStats();
    service.getAbsoluteFileName = (item) => `/media/${item.fileName}`;
    return service;
};

describe('MediaQueueService upload stats (PE-220)', () => {
    beforeEach(() => mockStat.mockReset());

    it('adds up the size and PUT time of each uploaded file', async () => {
        mockStat.mockResolvedValueOnce({size: 1200000}).mockResolvedValueOnce({size: '800000'});
        const service = newService();
        service.resetUploadStats();

        await service.recordUploadedFile({fileName: 'a.jpg'}, 5000);
        await service.recordUploadedFile({fileName: 'b.jpg'}, 3000);

        expect(service.getUploadStats()).toEqual({bytes: 2000000, transferMs: 8000});
    });

    it('starts from zero on every upload run', async () => {
        mockStat.mockResolvedValue({size: 1000});
        const service = newService();
        service.resetUploadStats();
        await service.recordUploadedFile({fileName: 'a.jpg'}, 100);
        service.resetUploadStats();

        expect(service.getUploadStats()).toEqual({bytes: 0, transferMs: 0});
    });

    it('leaves out a file whose size cannot be read, without failing', async () => {
        mockStat.mockRejectedValueOnce(new Error('ENOENT'));
        const service = newService();
        service.resetUploadStats();

        await expect(service.recordUploadedFile({fileName: 'gone.jpg'}, 4000)).resolves.toBeUndefined();
        expect(service.getUploadStats()).toEqual({bytes: 0, transferMs: 0});
    });

    it('leaves out a file below the sample size', async () => {
        mockStat.mockResolvedValueOnce({size: 4000});
        const service = newService();
        service.resetUploadStats();

        await service.recordUploadedFile({fileName: 'thumb.jpg'}, 900);

        expect(service.getUploadStats()).toEqual({bytes: 0, transferMs: 0});
    });

    describe('on the real upload path', () => {
        const delay = (ms, value) => new Promise(resolve => setTimeout(() => resolve(value), ms));

        const uploadingService = ({uploadFails = false} = {}) => {
            const service = newService();
            service.mediaExists = async () => true;
            service.getUploadUrl = () => delay(150, 'https://s3/put?sig=1');
            service.uploadToUrl = () => uploadFails ? Promise.reject(new Error('stalled')) : delay(10);
            service.replaceObservation = () => true;
            service.popItem = jest.fn();
            service.resetUploadStats();
            return service;
        };

        it('times only the S3 upload, not fetching the signed URL', async () => {
            mockStat.mockResolvedValue({size: 1000000});
            const service = uploadingService();

            await service.uploadMediaQueueItem({fileName: 'a.jpg'});

            expect(service.getUploadStats().bytes).toBe(1000000);
            expect(service.getUploadStats().transferMs).toBeLessThan(100);
        });

        it('records nothing for an upload that fails', async () => {
            mockStat.mockResolvedValue({size: 1000000});
            const service = uploadingService({uploadFails: true});

            await expect(service.uploadMediaQueueItem({fileName: 'a.jpg'})).rejects.toThrow('stalled');

            expect(service.getUploadStats()).toEqual({bytes: 0, transferMs: 0});
        });

        it('starts every upload run from zero', async () => {
            const service = newService();
            service.uploadStats.add({bytes: 1000000, transferMs: 5000});
            service.findAll = () => [];

            await service.uploadMedia();

            expect(service.getUploadStats()).toEqual({bytes: 0, transferMs: 0});
        });
    });
});
