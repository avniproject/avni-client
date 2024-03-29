import mockRNDeviceInfo from 'react-native-device-info/jest/react-native-device-info-mock';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
jest.mock('react-native-device-info', () => mockRNDeviceInfo);
jest.mock("../src/utility/Analytics", () => {});
jest.mock("@react-native-cookies/cookies", () => {});
