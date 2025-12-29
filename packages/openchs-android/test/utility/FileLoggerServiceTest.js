import {expect} from "chai";

const createMockRNFS = () => ({
    DocumentDirectoryPath: '/mock/documents',
    ExternalDirectoryPath: '/mock/external',
    exists: jest.fn(),
    mkdir: jest.fn(),
    stat: jest.fn(),
    readFile: jest.fn(),
    writeFile: jest.fn(),
    appendFile: jest.fn(),
    copyFile: jest.fn(),
    unlink: jest.fn(),
});

const createFileLoggerService = (mockRNFS) => {
    jest.resetModules();
    jest.doMock('react-native-fs', () => mockRNFS);
    const FileLoggerService = require('../../src/utility/FileLoggerService').default;
    return new FileLoggerService();
};

const generateRandomText = (length) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 ';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

describe('FileLoggerServiceTest', () => {
    let mockRNFS;
    let fileLoggerService;

    beforeEach(() => {
        mockRNFS = createMockRNFS();
        mockRNFS.exists.mockResolvedValue(false);
        mockRNFS.mkdir.mockResolvedValue();
        mockRNFS.appendFile.mockResolvedValue();
        fileLoggerService = createFileLoggerService(mockRNFS);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Initialization', () => {
        it('should create log directory if it does not exist', async () => {
            mockRNFS.exists.mockResolvedValue(false);
            
            await fileLoggerService.initialize();
            
            expect(mockRNFS.mkdir.calledOnce || mockRNFS.mkdir.mock.calls.length === 1).to.be.true;
            expect(fileLoggerService.isInitialized).to.be.true;
        });

        it('should not create directory if it already exists', async () => {
            mockRNFS.exists.mockResolvedValue(true);
            
            await fileLoggerService.initialize();
            
            expect(mockRNFS.mkdir.mock.calls.length).to.equal(0);
            expect(fileLoggerService.isInitialized).to.be.true;
        });

        it('should only initialize once', async () => {
            mockRNFS.exists.mockResolvedValue(false);
            
            await fileLoggerService.initialize();
            await fileLoggerService.initialize();
            
            expect(mockRNFS.exists.mock.calls.length).to.equal(1);
        });
    });

    describe('Logging Methods', () => {
        beforeEach(async () => {
            mockRNFS.exists.mockResolvedValue(true);
            mockRNFS.stat.mockResolvedValue({ size: 1000 });
            await fileLoggerService.initialize();
        });

        it('should write log entries with correct format', async () => {
            const testMessage = generateRandomText(50);
            
            fileLoggerService.log(testMessage);
            await new Promise(resolve => setTimeout(resolve, 150));
            
            expect(mockRNFS.appendFile.mock.calls.length).to.be.greaterThan(0);
            const writtenContent = mockRNFS.appendFile.mock.calls[0][1];
            expect(writtenContent).to.include('[LOG]');
            expect(writtenContent).to.include(testMessage);
        });

        it('should handle all log levels', async () => {
            await fileLoggerService.initialize();
            
            fileLoggerService.log('log message');
            fileLoggerService.info('info message');
            fileLoggerService.warn('warn message');
            fileLoggerService.error('error message');
            fileLoggerService.debug('debug message');
            
            await new Promise(resolve => setTimeout(resolve, 150));
            
            const allWrittenContent = mockRNFS.appendFile.mock.calls.map(c => c[1]).join('');
            expect(allWrittenContent).to.include('[LOG]');
            expect(allWrittenContent).to.include('[INFO]');
            expect(allWrittenContent).to.include('[WARN]');
            expect(allWrittenContent).to.include('[ERROR]');
            expect(allWrittenContent).to.include('[DEBUG]');
        });

        it('should format Error objects with stack trace', async () => {
            const testError = new Error('Test error message');
            
            fileLoggerService.error(testError);
            await new Promise(resolve => setTimeout(resolve, 150));
            
            const writtenContent = mockRNFS.appendFile.mock.calls[0][1];
            expect(writtenContent).to.include('Test error message');
        });

        it('should format objects as JSON', async () => {
            const testObject = { key: 'value', number: 42 };
            
            fileLoggerService.log(testObject);
            await new Promise(resolve => setTimeout(resolve, 150));
            
            const writtenContent = mockRNFS.appendFile.mock.calls[0][1];
            expect(writtenContent).to.include('"key":"value"');
            expect(writtenContent).to.include('"number":42');
        });

        it('should handle multiple arguments', async () => {
            fileLoggerService.log('message1', 'message2', 123);
            await new Promise(resolve => setTimeout(resolve, 150));
            
            const writtenContent = mockRNFS.appendFile.mock.calls[0][1];
            expect(writtenContent).to.include('message1');
            expect(writtenContent).to.include('message2');
            expect(writtenContent).to.include('123');
        });
    });

    describe('Monotonic Timestamp', () => {
        beforeEach(async () => {
            mockRNFS.exists.mockResolvedValue(true);
            mockRNFS.stat.mockResolvedValue({ size: 1000 });
            await fileLoggerService.initialize();
        });

        it('should handle system time going backward', async () => {
            const originalDateNow = Date.now;
            let currentTime = 1700000000000;
            
            Date.now = () => currentTime;
            fileLoggerService.lastWriteTime = currentTime;
            fileLoggerService.sequenceNumber = 0;
            
            const ts1 = fileLoggerService.getMonotonicTimestamp();
            expect(ts1).to.not.include('#');
            
            currentTime = 1699999999000; // Time goes backward
            const ts2 = fileLoggerService.getMonotonicTimestamp();
            expect(ts2).to.include('#1');
            
            currentTime = 1699999998000; // Time goes backward again
            const ts3 = fileLoggerService.getMonotonicTimestamp();
            expect(ts3).to.include('#2');
            
            Date.now = originalDateNow;
        });
    });

    describe('File Size Management', () => {
        beforeEach(async () => {
            mockRNFS.exists.mockResolvedValue(true);
            await fileLoggerService.initialize();
        });

        it('should not trim when file size is under limit', async () => {
            mockRNFS.stat.mockResolvedValue({ size: 5 * 1024 * 1024 }); // 5MB
            
            fileLoggerService.log('test');
            await new Promise(resolve => setTimeout(resolve, 150));
            
            expect(mockRNFS.writeFile.mock.calls.length).to.equal(0);
        });

        it('should trim when file exceeds 15MB', async () => {
            mockRNFS.stat.mockResolvedValue({ size: 16 * 1024 * 1024 }); // 16MB
            const largeContent = 'line1\nline2\nline3\nline4\nline5\n';
            mockRNFS.readFile.mockResolvedValue(largeContent);
            
            fileLoggerService.log('test');
            await new Promise(resolve => setTimeout(resolve, 150));
            
            expect(mockRNFS.readFile.mock.calls.length).to.be.greaterThan(0);
        });

        it('should handle random large text without crashing', async () => {
            mockRNFS.stat.mockResolvedValue({ size: 1000 });
            const largeRandomText = generateRandomText(10000);
            
            fileLoggerService.log(largeRandomText);
            await new Promise(resolve => setTimeout(resolve, 150));
            
            expect(mockRNFS.appendFile.mock.calls.length).to.be.greaterThan(0);
        });
    });

    describe('Security', () => {
        beforeEach(async () => {
            mockRNFS.exists.mockResolvedValue(true);
            mockRNFS.stat.mockResolvedValue({ size: 1000 });
            await fileLoggerService.initialize();
        });

        it('should write to fixed log path only', async () => {
            fileLoggerService.log('test');
            await new Promise(resolve => setTimeout(resolve, 150));
            
            const logPath = mockRNFS.appendFile.mock.calls[0][0];
            expect(logPath).to.equal('/mock/external/Avni/logs/avni.log');
        });

        it('should handle circular reference objects gracefully', async () => {
            const circularObj = { name: 'test' };
            circularObj.self = circularObj;
            
            fileLoggerService.log(circularObj);
            await new Promise(resolve => setTimeout(resolve, 150));
            
            const writtenContent = mockRNFS.appendFile.mock.calls[0][1];
            expect(writtenContent).to.include('[object Object]');
        });

        it('should handle null and undefined values', async () => {
            fileLoggerService.log(null, undefined, 'valid');
            await new Promise(resolve => setTimeout(resolve, 150));
            
            const writtenContent = mockRNFS.appendFile.mock.calls[0][1];
            expect(writtenContent).to.include('null');
            expect(writtenContent).to.include('undefined');
            expect(writtenContent).to.include('valid');
        });
    });

    describe('Performance', () => {
        beforeEach(async () => {
            mockRNFS.exists.mockResolvedValue(true);
            mockRNFS.stat.mockResolvedValue({ size: 1000 });
            await fileLoggerService.initialize();
        });

        it('should batch write queue entries', async () => {
            for (let i = 0; i < 50; i++) {
                fileLoggerService.log(`message ${i}`);
            }
            
            await new Promise(resolve => setTimeout(resolve, 200));
            
            expect(mockRNFS.appendFile.mock.calls.length).to.be.lessThan(50);
        });

        it('should handle rapid consecutive logs', async () => {
            const startTime = Date.now();
            
            for (let i = 0; i < 100; i++) {
                fileLoggerService.log(generateRandomText(100));
            }
            
            const syncTime = Date.now() - startTime;
            expect(syncTime).to.be.lessThan(100); // Should be non-blocking
            
            await new Promise(resolve => setTimeout(resolve, 300));
            expect(mockRNFS.appendFile.mock.calls.length).to.be.greaterThan(0);
        });
    });

    describe('Export and Clear', () => {
        beforeEach(async () => {
            mockRNFS.exists.mockResolvedValue(true);
            await fileLoggerService.initialize();
        });

        it('should export logs to destination path', async () => {
            mockRNFS.copyFile.mockResolvedValue();
            
            const result = await fileLoggerService.exportLogs('/export/path.log');
            
            expect(result).to.equal('/export/path.log');
            expect(mockRNFS.copyFile.mock.calls.length).to.equal(1);
        });

        it('should clear all logs', async () => {
            mockRNFS.unlink.mockResolvedValue();
            
            await fileLoggerService.clearAllLogs();
            
            expect(mockRNFS.unlink.mock.calls.length).to.equal(1);
        });

        it('should return null when exporting non-existent logs', async () => {
            mockRNFS.exists.mockResolvedValue(false);
            
            const result = await fileLoggerService.exportLogs('/export/path.log');
            
            expect(result).to.be.null;
        });
    });
});
