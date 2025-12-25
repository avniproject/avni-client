import {expect} from "chai";

const createMockLogger = () => ({
    log: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    initialize: jest.fn().mockResolvedValue(),
});

const createMockEnvironmentConfig = (isNonDevMode) => ({
    inNonDevMode: () => isNonDevMode,
});

const createConsoleLogInterceptorService = (mockLogger, isNonDevMode = false) => {
    jest.resetModules();
    jest.doMock('../../src/framework/EnvironmentConfig', () => createMockEnvironmentConfig(isNonDevMode));
    const ConsoleLogInterceptorService = require('../../src/utility/ConsoleLogInterceptorService').default;
    return new ConsoleLogInterceptorService(mockLogger);
};

const generateRandomText = (length) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 !@#$%^&*()';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

describe('ConsoleLogInterceptorServiceTest', () => {
    let originalConsole;

    beforeEach(() => {
        originalConsole = {
            log: console.log,
            info: console.info,
            warn: console.warn,
            error: console.error,
            debug: console.debug,
        };
    });

    afterEach(() => {
        console.log = originalConsole.log;
        console.info = originalConsole.info;
        console.warn = originalConsole.warn;
        console.error = originalConsole.error;
        console.debug = originalConsole.debug;
        jest.clearAllMocks();
    });

    describe('Dev Mode Behavior', () => {
        it('should delegate to logger and pass through to original console', async () => {
            const mockLogger = createMockLogger();
            const originalLogSpy = jest.fn();
            console.log = originalLogSpy;
            
            const interceptor = createConsoleLogInterceptorService(mockLogger, false);
            await interceptor.initialize();
            
            console.log('test message');
            
            expect(mockLogger.log.mock.calls.length).to.equal(1);
            expect(mockLogger.log.mock.calls[0][0]).to.equal('test message');
            expect(originalLogSpy.mock.calls.length).to.equal(1);
        });

        it('should handle all console methods in dev mode', async () => {
            const mockLogger = createMockLogger();
            const spies = {
                log: jest.fn(),
                info: jest.fn(),
                warn: jest.fn(),
                error: jest.fn(),
                debug: jest.fn(),
            };
            Object.assign(console, spies);
            
            const interceptor = createConsoleLogInterceptorService(mockLogger, false);
            await interceptor.initialize();
            
            console.log('log');
            console.info('info');
            console.warn('warn');
            console.error('error');
            console.debug('debug');
            
            expect(mockLogger.log.mock.calls.length).to.equal(1);
            expect(mockLogger.info.mock.calls.length).to.equal(1);
            expect(mockLogger.warn.mock.calls.length).to.equal(1);
            expect(mockLogger.error.mock.calls.length).to.equal(1);
            expect(mockLogger.debug.mock.calls.length).to.equal(1);
            
            expect(spies.log.mock.calls.length).to.equal(1);
            expect(spies.info.mock.calls.length).to.equal(1);
            expect(spies.warn.mock.calls.length).to.equal(1);
            expect(spies.error.mock.calls.length).to.equal(1);
            expect(spies.debug.mock.calls.length).to.equal(1);
        });
    });

    describe('Non-Dev Mode Behavior', () => {
        it('should delegate to logger but NOT pass through to original console', async () => {
            const mockLogger = createMockLogger();
            const originalLogSpy = jest.fn();
            console.log = originalLogSpy;
            
            const interceptor = createConsoleLogInterceptorService(mockLogger, true);
            await interceptor.initialize();
            
            console.log('test message');
            
            expect(mockLogger.log.mock.calls.length).to.equal(1);
            expect(originalLogSpy.mock.calls.length).to.equal(0);
        });

        it('should suppress all console output in non-dev mode', async () => {
            const mockLogger = createMockLogger();
            const spies = {
                log: jest.fn(),
                info: jest.fn(),
                warn: jest.fn(),
                error: jest.fn(),
                debug: jest.fn(),
            };
            Object.assign(console, spies);
            
            const interceptor = createConsoleLogInterceptorService(mockLogger, true);
            await interceptor.initialize();
            
            console.log('log');
            console.info('info');
            console.warn('warn');
            console.error('error');
            console.debug('debug');
            
            expect(mockLogger.log.mock.calls.length).to.equal(1);
            expect(mockLogger.info.mock.calls.length).to.equal(1);
            expect(mockLogger.warn.mock.calls.length).to.equal(1);
            expect(mockLogger.error.mock.calls.length).to.equal(1);
            expect(mockLogger.debug.mock.calls.length).to.equal(1);
            
            expect(spies.log.mock.calls.length).to.equal(0);
            expect(spies.info.mock.calls.length).to.equal(0);
            expect(spies.warn.mock.calls.length).to.equal(0);
            expect(spies.error.mock.calls.length).to.equal(0);
            expect(spies.debug.mock.calls.length).to.equal(0);
        });
    });

    describe('Argument Handling', () => {
        it('should pass multiple arguments to logger', async () => {
            const mockLogger = createMockLogger();
            const interceptor = createConsoleLogInterceptorService(mockLogger, true);
            await interceptor.initialize();
            
            console.log('arg1', 'arg2', 123, { key: 'value' });
            
            expect(mockLogger.log.mock.calls[0]).to.deep.equal(['arg1', 'arg2', 123, { key: 'value' }]);
        });

        it('should handle random text of various lengths', async () => {
            const mockLogger = createMockLogger();
            const interceptor = createConsoleLogInterceptorService(mockLogger, true);
            await interceptor.initialize();
            
            const shortText = generateRandomText(10);
            const mediumText = generateRandomText(1000);
            const longText = generateRandomText(10000);
            
            console.log(shortText);
            console.log(mediumText);
            console.log(longText);
            
            expect(mockLogger.log.mock.calls.length).to.equal(3);
            expect(mockLogger.log.mock.calls[0][0]).to.equal(shortText);
            expect(mockLogger.log.mock.calls[1][0]).to.equal(mediumText);
            expect(mockLogger.log.mock.calls[2][0]).to.equal(longText);
        });

        it('should handle special characters', async () => {
            const mockLogger = createMockLogger();
            const interceptor = createConsoleLogInterceptorService(mockLogger, true);
            await interceptor.initialize();
            
            const specialChars = '!@#$%^&*()_+-=[]{}|;:\'",.<>?/\\`~\n\t\r';
            console.log(specialChars);
            
            expect(mockLogger.log.mock.calls[0][0]).to.equal(specialChars);
        });

        it('should handle unicode characters', async () => {
            const mockLogger = createMockLogger();
            const interceptor = createConsoleLogInterceptorService(mockLogger, true);
            await interceptor.initialize();
            
            const unicode = '日本語 中文 한국어 العربية हिंदी 🎉🚀💻';
            console.log(unicode);
            
            expect(mockLogger.log.mock.calls[0][0]).to.equal(unicode);
        });
    });

    describe('Security', () => {
        it('should not expose original console methods after interception', async () => {
            const mockLogger = createMockLogger();
            const originalLog = console.log;
            
            const interceptor = createConsoleLogInterceptorService(mockLogger, true);
            await interceptor.initialize();
            
            expect(console.log).to.not.equal(originalLog);
        });

        it('should handle Error objects properly', async () => {
            const mockLogger = createMockLogger();
            const interceptor = createConsoleLogInterceptorService(mockLogger, true);
            await interceptor.initialize();
            
            const error = new Error('Test error');
            console.error(error);
            
            expect(mockLogger.error.mock.calls[0][0]).to.equal(error);
        });

        it('should handle null and undefined', async () => {
            const mockLogger = createMockLogger();
            const interceptor = createConsoleLogInterceptorService(mockLogger, true);
            await interceptor.initialize();
            
            console.log(null);
            console.log(undefined);
            
            expect(mockLogger.log.mock.calls[0][0]).to.be.null;
            expect(mockLogger.log.mock.calls[1][0]).to.be.undefined;
        });
    });

    describe('Performance', () => {
        it('should handle rapid consecutive calls', async () => {
            const mockLogger = createMockLogger();
            const interceptor = createConsoleLogInterceptorService(mockLogger, true);
            await interceptor.initialize();
            
            const startTime = Date.now();
            for (let i = 0; i < 1000; i++) {
                console.log(`message ${i}`);
            }
            const duration = Date.now() - startTime;
            
            expect(mockLogger.log.mock.calls.length).to.equal(1000);
            expect(duration).to.be.lessThan(500); // Should be fast
        });

        it('should not block on logger operations', async () => {
            const slowLogger = {
                log: jest.fn(() => new Promise(resolve => setTimeout(resolve, 100))),
                info: jest.fn(),
                warn: jest.fn(),
                error: jest.fn(),
                debug: jest.fn(),
                initialize: jest.fn().mockResolvedValue(),
            };
            
            const interceptor = createConsoleLogInterceptorService(slowLogger, true);
            await interceptor.initialize();
            
            const startTime = Date.now();
            console.log('test');
            const duration = Date.now() - startTime;
            
            expect(duration).to.be.lessThan(50); // Should return immediately
        });
    });

    describe('Initialization', () => {
        it('should initialize the injected logger', async () => {
            const mockLogger = createMockLogger();
            const interceptor = createConsoleLogInterceptorService(mockLogger, false);
            
            await interceptor.initialize();
            
            expect(mockLogger.initialize.mock.calls.length).to.equal(1);
        });

        it('should intercept console after initialization', async () => {
            const mockLogger = createMockLogger();
            const originalLog = console.log;
            
            const interceptor = createConsoleLogInterceptorService(mockLogger, false);
            
            expect(console.log).to.equal(originalLog);
            
            await interceptor.initialize();
            
            expect(console.log).to.not.equal(originalLog);
        });
    });
});
