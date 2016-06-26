let instance = null;
import RuntimeMode from '../../utility/RuntimeMode';

class FileSystemGateway {
    constructor() {
        if (!instance) {
            instance = this;
            if (RuntimeMode.runningTest()) {
                this.RNFS = {};
            } else {
                this.RNFS = require('react-native-fs');
            }
        }
        return instance;
    }

    createFile(name, contents) {
        // create a path you want to write to
        var path = `${this.RNFS.DocumentDirectoryPath}/${name}`;

        // write the file
        this.RNFS.writeFile(path, contents, 'utf8')
            .then((success) => {
                console.log(`A new file created at ${path}`);
            })
            .catch((err) => {
                console.log(err.message);
            });
    }

    readFile(name, onRead, context) {
        var path = `${this.RNFS.DocumentDirectoryPath}/${name}`;
        console.log(`Reading file ${path}`);
        this.RNFS.readFile(path, 'utf8')
            .then((contents) => {
                onRead(contents, context);
            }).catch((err) => {
            console.error(`Error reading file: ${path} --> ${err}`);
        });
    }

    logFileNames(dir) {
        this.RNFS.readDir(this.RNFS.DocumentDirectoryPath).then((result) => {
            console.log('GOT RESULT', result);
        }).catch((err) => {
            console.error(`${err}`);
        });
    }
}

export default new FileSystemGateway();