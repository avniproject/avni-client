var RN = require('react-native');

RN.NativeModules['RNI18n'] = {'locale': 'en_GB'};
RN.NativeModules['RNFetchBlob'] = {'locale': 'en_GB'};

require('babel-core/register')({
    ignore: function (filename) {
        if (filename.indexOf("node_modules") === -1) {
            return false;
        } else if (filename.indexOf("node_modules") !== -1 && filename.indexOf("react-native-i18n") !== -1) {
            return false;
        } else if (filename.indexOf("node_modules") !== -1 && filename.indexOf("react-native-fetch-blob") !== -1) {
            return false;
        } else if (filename.indexOf("node_modules") !== -1 && filename.indexOf("native-base") !== -1) {
            return false;
        } else if (filename.indexOf("node_modules") !== -1 && filename.indexOf("react-native") !== -1) {
            return false;
        }
        return true;
    }
});