// __mocks__/@bugsnag/react-native.js
const Bugsnag = {
  start: jest.fn(),
  notify: jest.fn(),
  leaveBreadcrumb: jest.fn(),
  setUser: jest.fn(),
  clearUser: jest.fn(),
};

export default Bugsnag;

