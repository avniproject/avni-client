import LoggingService from '../service/gateway/LoggingService';
import RuntimeMode from '../utility/RuntimeMode';

let instance = null;

class ConfigurationData {
    constructor() {
        if (!instance) {
            instance = this;

            this.questionnaireConfigurations = new Map();

            if (process.env.NODE_ENV === "development" || RuntimeMode.runningTest()) {
                this.diabetes = require('../../config/diabetes.json');
                this.sample = require('../../config/sample-questionnaire.json');

                this.questionnaireConfigurations.set(this.sample.name, this.sample);
                this.questionnaireConfigurations.set(this.diabetes.name, this.diabetes);
            }

            this.numberOfFilesRead = 0;
        }
        return instance;
    }

    static onRead(contents, self) {
        const obj = JSON.parse(contents);
        self.questionnaireConfigurations.set(obj.name, obj);
        self.numberOfFilesRead++;
        console.log(`File ${obj.name} read completed`);
        LoggingService.log(`File ${obj.name} read completed`);
    }

    static onError(errorMessage, self) {
        self.errorMessage = errorMessage;
    }
    
    get initialised() {
        return true;
    }
}

export default new ConfigurationData();