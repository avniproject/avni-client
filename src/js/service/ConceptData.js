import FileSystemGateway from "./gateway/FileSystemGateway";
import RuntimeMode from '../utility/RuntimeMode';

let instance = null;

class ConceptData {
    constructor() {
        if (!instance) {
            instance = this;
            this.numberOfFilesRead = 0;
            if (RuntimeMode.runningTest())
                this.concepts = require("../../config/sample-concepts.json");
            else {
                this.concepts = require("../../config/concepts.json");
                // FileSystemGateway.readFile('concepts.json', ConceptData.onRead, ConceptData.onError, this);
            }
        }

        return instance;
    }

    static onRead(contents, context) {
        context.concepts = JSON.parse(contents);
        context.numberOfFilesRead++;
        console.log("ConceptData reading completed");
    }
    
    static onError(errorMessage, self) {
        self.errorMessage = errorMessage;
    }
    
    get initialised() {
        return true;
        // return this.numberOfFilesRead === 1 || this.errorMessage !== undefined;
    }
}

export default new ConceptData();