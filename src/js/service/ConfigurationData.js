// import FileSystemGateway from '../service/gateway/FileSystemGateway';
import LoggingService from '../service/gateway/LoggingService';
import RuntimeMode from '../utility/RuntimeMode';

let instance = null;

class ConfigurationData {
    constructor() {
        if (!instance) {
            instance = this;

            this.diabetes = require('../../config/diabetes.json');
            this.sample = require('../../config/sample-questionnaire.json');
            this.vhw = require('../../config/vhw-lokbiradari.json');

            this.questionnaireConfigurations = new Map();
            this.questionnaireConfigurations.set(this.sample.name, this.sample);
            this.questionnaireConfigurations.set(this.diabetes.name, this.diabetes);
            this.questionnaireConfigurations.set(this.vhw.name, this.vhw);

            this.numberOfFilesRead = 0;

            if (!RuntimeMode.runningTest()) {
                // FileSystemGateway.readFile('vhw-lokbiradari.json', ConfigurationData.onRead, ConfigurationData.onError, this);
                // FileSystemGateway.readFile('bmi.json', ConfigurationData.onRead, ConfigurationData.onError, this);
            }
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
        // return this.numberOfFilesRead === 2 || this.errorMessage !== undefined;
    }
}

export default new ConfigurationData();