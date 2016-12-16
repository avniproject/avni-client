var RN = require('react-native');

RN.NativeModules['RNI18n'] = {'locale': 'en_GB'};
RN.NativeModules['RNFetchBlob'] = {'locale': 'en_GB'};

var ignoredFiles = ["react-native-i18n", "react-native-fetch-blob", "native-base"];

require('babel-core/register')({
    ignore: function (filename) {
        console.log(filename);
        if (filename.indexOf("node_modules") === -1) {
            return false;
        } else if (filename.indexOf("node_modules") !== -1 && ignoredFiles.indexOf(filename) !== -1) {
            return false;
        }
        return true;
    }
});