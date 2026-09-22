// Code from: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error

export const NO_USER = 'No User';
export const HTTP_401 = 'Http 401';
export const HTTP_403 = 'Http 403';
export const NOT_AUTHORIZED = 'NotAuthorizedException';
export const NETWORK_ERROR = 'NetworkError';

const RE_LOGIN_AUTH_CODES = [HTTP_401, NO_USER, NOT_AUTHORIZED];

// Allow-list, not a deny-list: the previous guard excluded one vendor spelling and sent every
// other failure — a dropped network included — to the login screen, where a mis-tap on
// "Delete data and login" destroys unsynced work. An unrecognised code keeps the session.
export function requiresReLogin(error) {
    return RE_LOGIN_AUTH_CODES.indexOf(error.authErrCode) > -1;
}

function AuthenticationError(code, message, fileName, lineNumber) {
    let instance = new Error(message, fileName, lineNumber);
    // Bugsnag groups by error.name, which the Error base leaves as "Error" — every auth failure
    // landed in the same anonymous bucket, which is why these reports looked empty.
    instance.name = 'AuthenticationError';
    instance.authErrCode = code;
    instance.authErrDate = new Date();

    if (Object.setPrototypeOf) {
        Object.setPrototypeOf(instance, Object.getPrototypeOf(this));
    } else {
        instance.__proto__ = Object.getPrototypeOf(this);
    }
    return instance;
}

AuthenticationError.prototype = Object.create(Error.prototype, {
    constructor: {
        value: Error,
        enumerable: false,
        writable: true,
        configurable: true
    }
});

if (Object.setPrototypeOf){
    Object.setPrototypeOf(AuthenticationError, Error);
} else {
    AuthenticationError.__proto__ = Error;
}

export default AuthenticationError;