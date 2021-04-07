// Code from: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error

export const NO_USER = 'No User';

function AuthenticationError(code, message, fileName, lineNumber) {
    let instance = new Error(message, fileName, lineNumber);
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