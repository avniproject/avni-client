import FileSystemGateway from "./gateway/FileSystemGateway";
import RuntimeMode from '../utility/RuntimeMode';

let instance = null;

class ConceptData {
    constructor() {
        if (!instance) {
            instance = this;
            this.numberOfFilesRead = 0;
            if (RuntimeMode.runningTest())
                instance.concepts = require("../../config/sample-concepts.json");
            else {
                FileSystemGateway.readFile('concepts.json', ConceptData.onRead, this);
            }
        }

        return instance;
    }

    static onRead(contents, context) {
        context.concepts = JSON.parse(contents);
        context.numberOfFilesRead++;
        console.log("ConceptData reading completed");
    }
    
    get initialised() {
        return this.numberOfFilesRead === 1;
    }
}

export default new ConceptData();