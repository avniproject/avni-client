require('babel-core/register')({});
var RN = require('react-native');

var mockFN = function () {
};

RN.NativeModules['RNFSManager'] = {
    readDir: mockFN,
    exists: mockFN,
    stat: mockFN,
    readFile: mockFN,
    writeFile: mockFN,
    moveFile: mockFN,
    unlink: mockFN,
    mkdir: mockFN,
    downloadFile: mockFN,
    pathForBundle: mockFN,
    getFSInfo: mockFN
};

