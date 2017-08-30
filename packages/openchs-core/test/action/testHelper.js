var RN = require('react-native');

RN.NativeModules['RNI18n'] = {'locale': 'en_GB'};
RN.NativeModules['RNFetchBlob'] = {'locale': 'en_GB'};

const es6Modules = ['react-native-i18n', 'react-native-fetch-blob', 'native-base', 'react-native', 'victory-native'];

require('babel-core/register')({
    ignore: function (filename) {
        if (filename.indexOf("node_modules") === -1 || es6Modules.some((es6Module) => filename.indexOf(es6Module) !== -1)) {
            return false;
        }
        return true;
    }
});