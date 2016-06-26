import FileSystemGateway from '../service/gateway/FileSystemGateway';
import RuntimeMode from '../utility/RuntimeMode';

let instance = null;

class ConfigurationData {
    constructor() {
        if (!instance) {
            instance = this;

            this.diabetes = require('../../config/diabetes.json');
            this.sample = require('../../config/sample-questionnaire.json');

            this.questionnaireConfigurations = new Map();
            this.questionnaireConfigurations.set(this.sample.name, this.sample);
            this.questionnaireConfigurations.set(this.diabetes.name, this.diabetes);

            this.numberOfFilesRead = 0;

            if (!RuntimeMode.runningTest()) {
                FileSystemGateway.readFile('vhw-lokbiradari.json', ConfigurationData.onRead, this);
                FileSystemGateway.readFile('bmi.json', ConfigurationData.onRead, this);
            }
        }
        return instance;
    }

    static onRead(contents, self) {
        const obj = JSON.parse(contents);
        self.questionnaireConfigurations.set(obj.name, obj);
        self.numberOfFilesRead++;
        console.log(`File ${obj.name} read completed`);
    }
    
    get initialised() {
        return this.numberOfFilesRead === 2;
    }
}

export default new ConfigurationData();