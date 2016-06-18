import React, {NativeModules} from 'react-native';
import BaseService from "./BaseService";
import Service from "../framework/Service";
import DecisionSupportSessionService from "./DecisionSupportSessionService";
// import RNFS from 'react-native-fs';

@Service("exportService")
class ExportService extends BaseService {
    constructor(db) {
        super(db);
    }

    export() {
        const decisionSupportSessionService = new DecisionSupportSessionService(this.db);
        const allSessions = decisionSupportSessionService.getAll();


        // require the module
        var RNFS = require('react-native-fs');

// create a path you want to write to
        var path = RNFS.DocumentDirectoryPath + '/test.txt';

// write the file
        RNFS.writeFile(path, 'Lorem ipsum dolor sit amet', 'utf8')
            .then((success) => {
                console.log('FILE WRITTEN!');
            })
            .catch((err) => {
                console.log(err.message);
            });
    }
}

export default ExportService;