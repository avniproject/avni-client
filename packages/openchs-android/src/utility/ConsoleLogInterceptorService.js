import EnvironmentConfig from '../framework/EnvironmentConfig';

const originalConsole = {
    log: console.log.bind(console),
    info: console.info.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
    debug: console.debug.bind(console),
};

class ConsoleLogInterceptorService {
    constructor(logger) {
        this.logger = logger;
        this.logToFileOnly = EnvironmentConfig.inNonDevMode();
    }

    async initialize() {
        await this.logger.initialize();
        this.intercept();
    }

    intercept() {
        const self = this;

        console.log = function (...args) {
            self.handleConsoleCall('log', args);
        };

        console.info = function (...args) {
            self.handleConsoleCall('info', args);
        };

        console.warn = function (...args) {
            self.handleConsoleCall('warn', args);
        };

        console.error = function (...args) {
            self.handleConsoleCall('error', args);
        };

        console.debug = function (...args) {
            self.handleConsoleCall('debug', args);
        };
    }

    handleConsoleCall(method, args) {
        this.logger[method](...args);

        if (!this.logToFileOnly) {
            originalConsole[method](...args);
        }
    }
}

export default ConsoleLogInterceptorService;
