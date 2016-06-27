import FileSystemGateway from "./FileSystemGateway";
let instance = null;

class LoggingService {
    constructor() {
        if (!instance) {
            instance = this;
            this.logMessage = "";
        }

        return instance;
    }

    log(logMessage) {
        this.logMessage += logMessage;
        FileSystemGateway.writeFile("log.txt", this.logMessage);
    }
}

export default new LoggingService();