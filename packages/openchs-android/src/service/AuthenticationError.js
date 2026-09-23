// Code from: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error

export const NO_USER = 'No User';
export const HTTP_401 = 'Http 401';
export const HTTP_403 = 'Http 403';
export const NOT_AUTHORIZED = 'NotAuthorizedException';
export const NETWORK_ERROR = 'NetworkError';

const SESSION_SURVIVES_AUTH_CODES = [NETWORK_ERROR, HTTP_403];

// Listed by what the session survives, because only that set is closed. The codes that end a
// session cannot be enumerated: getSession reports "Please authenticate" as a plain Error with no
// code at all, and the service exceptions that end one (UserNotFoundException,
// PasswordResetRequiredException, ...) arrive straight from data.__type. So an unrecognised or
// missing code means re-login, and the two recoverable cases are named here instead. The canary
// test pins NetworkError's spelling, which is the one string this depends on.
export function requiresReLogin(error) {
    return SESSION_SURVIVES_AUTH_CODES.indexOf(error.authErrCode) === -1;
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