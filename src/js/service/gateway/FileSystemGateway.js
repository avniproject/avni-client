let instance = null;
import RNFS from 'react-native-fs';

class FileSystemGateway {
    constructor() {
        if (!instance) {
            instance = this;
            this.RNFS = RNFS;
        }
        return instance;
    }

    createFile(name, contents) {
        // create a path you want to write to
        var path = `${this.basePath}/${name}`;

        // write the file
        this.RNFS.writeFile(path, contents, 'utf8')
            .then((success) => {
                console.log(`A new file created at ${path}`);
            })
            .catch((err) => {
                console.log(err.message);
            });
    }

    readFile(name, onRead, onError, context) {
        var path = `${this.basePath}/${name}`;
        console.log(`Reading file ${path}`);
        this.RNFS.readFile(path, 'utf8')
            .then((contents) => {
                onRead(contents, context);
            }).catch((err) => {
            console.error(`Error reading file: ${path} --> ${err}`);
            onError(`Error reading file: ${path} --> ${err}`, context);
        });
    }

    logFileNames(dir) {
        this.RNFS.readDir(this.basePath).then((result) => {
            console.log('GOT RESULT', result);
        }).catch((err) => {
            console.error(`${err}`);
        });
    }

    writeFile(fileName, message) {
        var path = `${this.basePath}/${fileName}`;
        this.RNFS.writeFile(path, message, 'utf8', {append: 'true'}).then((success) => {
            console.log('Log written');
        })
            .catch((err) => {
                console.error(err.message);
            });
    }

    get basePath() {
        return this.RNFS.DocumentDirectoryPath;
    }
}

export default new FileSystemGateway();