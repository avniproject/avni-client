class FileSystemGateway {
    createFile(name, contents) {
        const RNFS = require('react-native-fs');

        // create a path you want to write to
        var path = `${RNFS.DocumentDirectoryPath}/${name}`;

        // write the file
        RNFS.writeFile(path, contents, 'utf8')
            .then((success) => {
                console.log(`A new file created at ${path}`);
            })
            .catch((err) => {
                console.log(err.message);
            });
    }
}

export default FileSystemGateway;