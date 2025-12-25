import RNFS from 'react-native-fs';
import moment from 'moment';

const LOG_DIR = `${RNFS.DocumentDirectoryPath}/logs`;
const LOG_FILE_NAME = 'avni.log';
const LOG_FILE_PATH = `${LOG_DIR}/${LOG_FILE_NAME}`;
const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15MB max
const TRIM_TARGET_BYTES = 10 * 1024 * 1024; // Trim to 10MB when rotating

class FileLoggerService {
    constructor() {
        this.isInitialized = false;
        this.writeQueue = [];
        this.isWriting = false;
        this.sequenceNumber = 0;
        this.lastWriteTime = Date.now();
    }

    async initialize() {
        if (this.isInitialized) return;

        try {
            const dirExists = await RNFS.exists(LOG_DIR);
            if (!dirExists) {
                await RNFS.mkdir(LOG_DIR);
            }
            this.isInitialized = true;
        } catch (error) {
            console.error('FileLoggerService: Failed to initialize', error);
        }
    }

    getMonotonicTimestamp() {
        const now = Date.now();
        if (now < this.lastWriteTime) {
            this.sequenceNumber++;
        } else {
            this.lastWriteTime = now;
        }
        const timestamp = moment(this.lastWriteTime).format('YYYY-MM-DD HH:mm:ss.SSS');
        return this.sequenceNumber > 0 ? `${timestamp}#${this.sequenceNumber}` : timestamp;
    }

    formatMessage(msg) {
        if (msg instanceof Error) return `${msg.message}\n${msg.stack || ''}`;
        if (typeof msg === 'object') {
            try {
                return JSON.stringify(msg);
            } catch {
                return String(msg);
            }
        }
        return String(msg);
    }

    log(...args) {
        this.writeLog('LOG', args);
    }

    info(...args) {
        this.writeLog('INFO', args);
    }

    warn(...args) {
        this.writeLog('WARN', args);
    }

    error(...args) {
        this.writeLog('ERROR', args);
    }

    debug(...args) {
        this.writeLog('DEBUG', args);
    }

    writeLog(level, args) {
        if (!this.isInitialized) {
            this.initialize().then(() => this.writeLog(level, args));
            return;
        }

        const timestamp = this.getMonotonicTimestamp();
        const formattedMessages = args.map(msg => this.formatMessage(msg)).join(' ');
        const logEntry = `[${timestamp}] [${level}] ${formattedMessages}`;
        this.writeQueue.push(logEntry);
        this.processQueue();
    }

    async trimLogFile() {
        try {
            const exists = await RNFS.exists(LOG_FILE_PATH);
            if (!exists) return;

            const stat = await RNFS.stat(LOG_FILE_PATH);
            if (stat.size <= MAX_FILE_SIZE_BYTES) return;

            const content = await RNFS.readFile(LOG_FILE_PATH, 'utf8');
            const bytesToRemove = content.length - TRIM_TARGET_BYTES;
            let trimIndex = 0;
            let removedBytes = 0;

            const lines = content.split('\n');
            for (let i = 0; i < lines.length && removedBytes < bytesToRemove; i++) {
                removedBytes += lines[i].length + 1;
                trimIndex = i + 1;
            }

            if (trimIndex > 0) {
                const trimmedContent = lines.slice(trimIndex).join('\n');
                await RNFS.writeFile(LOG_FILE_PATH, trimmedContent, 'utf8');
            }
        } catch (error) {
            // Use native console to avoid recursion
            console.error('FileLoggerService: Failed to trim log file', error);
        }
    }

    async processQueue() {
        if (this.isWriting || this.writeQueue.length === 0) return;

        this.isWriting = true;
        try {
            const entries = this.writeQueue.splice(0, 100);
            const content = entries.join('\n') + '\n';

            await this.trimLogFile();
            await RNFS.appendFile(LOG_FILE_PATH, content, 'utf8');
        } catch (error) {
            console.error('FileLoggerService: Failed to write log', error);
        } finally {
            this.isWriting = false;
            if (this.writeQueue.length > 0) {
                setTimeout(() => this.processQueue(), 100);
            }
        }
    }

    async getLogFilePath() {
        return LOG_FILE_PATH;
    }

    async getLogContent() {
        try {
            const exists = await RNFS.exists(LOG_FILE_PATH);
            if (exists) {
                return await RNFS.readFile(LOG_FILE_PATH, 'utf8');
            }
            return '';
        } catch (error) {
            console.error('FileLoggerService: Failed to read log', error);
            return '';
        }
    }

    getLogDirectory() {
        return LOG_DIR;
    }

    async exportLogs(destinationPath) {
        try {
            const exists = await RNFS.exists(LOG_FILE_PATH);
            if (!exists) return null;

            await RNFS.copyFile(LOG_FILE_PATH, destinationPath);
            return destinationPath;
        } catch (error) {
            console.error('FileLoggerService: Failed to export logs', error);
            return null;
        }
    }

    async clearAllLogs() {
        try {
            const exists = await RNFS.exists(LOG_FILE_PATH);
            if (exists) {
                await RNFS.unlink(LOG_FILE_PATH);
            }
        } catch (error) {
            console.error('FileLoggerService: Failed to clear logs', error);
        }
    }
}

export default FileLoggerService;
