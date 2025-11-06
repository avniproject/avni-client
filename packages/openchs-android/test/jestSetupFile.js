import mockRNDeviceInfo from 'react-native-device-info/jest/react-native-device-info-mock';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
jest.mock('react-native-device-info', () => mockRNDeviceInfo);
jest.mock("../src/utility/Analytics", () => {});
jest.mock("@react-native-cookies/cookies", () => {});
jest.mock('react-native-blob-util', () => ({
  DocumentDir: () => {},
  polyfill: () => {},
  fs: {
    dirs: {
      DocumentDir: '/mock/document',
      CacheDir: '/mock/cache',
    },
    exists: jest.fn(() => Promise.resolve(false)),
    writeFile: jest.fn(() => Promise.resolve()),
    readFile: jest.fn(() => Promise.resolve('')),
    unlink: jest.fn(() => Promise.resolve()),
    mkdir: jest.fn(() => Promise.resolve()),
    ls: jest.fn(() => Promise.resolve([])),
  },
  config: jest.fn(() => ({
    fetch: jest.fn(() => Promise.resolve({
      info: () => ({ status: 200 }),
      data: '',
      path: () => '/mock/path',
    })),
  })),
  fetch: jest.fn(() => Promise.resolve({
    info: () => ({ status: 200 }),
    data: '',
    path: () => '/mock/path',
  })),
}));
// Mock Realm
jest.mock('realm', () => {
  return class MockRealm {
    constructor() {
      this.objects = jest.fn().mockReturnValue([]);
      this.write = jest.fn(callback => callback());
      this.delete = jest.fn();
      this.close = jest.fn();
    }
    static open = jest.fn(() => new MockRealm());
  };
});
