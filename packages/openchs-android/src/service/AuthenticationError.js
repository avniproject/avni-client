// Code from: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error

export const NO_USER = 'No User';
export const HTTP_401 = 'Http 401';
export const HTTP_403 = 'Http 403';
export const NOT_AUTHORIZED = 'NotAuthorizedException';
export const NETWORK_ERROR = 'NetworkError';
// Ours, not the SDK's.
export const UNREADABLE_AUTH_RESPONSE = 'UnreadableAuthResponse';

// Codes that end a session cannot be enumerated (Cognito passes its service exceptions through), so the survivors are listed.
const SESSION_SURVIVES_AUTH_CODES = [NETWORK_ERROR, UNREADABLE_AUTH_RESPONSE, HTTP_403];

// A codeless TypeError is the SDK failing to parse a non-JSON reply (captive portal, proxy 502), not a session ending.
export function authErrCodeFromCognitoError(err) {
    if (err.code !== undefined && err.code !== null) return err.code;
    return err instanceof TypeError ? UNREADABLE_AUTH_RESPONSE : undefined;
}

export function requiresReLogin(error) {
    return SESSION_SURVIVES_AUTH_CODES.indexOf(error.authErrCode) === -1;
}

function AuthenticationError(code, message, fileName, lineNumber) {
    let instance = new Error(message, fileName, lineNumber);
    // Bugsnag groups by name, and the Error base leaves it as "Error".
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