function AuthenticationError(message, fileName, lineNumber) {
    let instance = new Error(message, fileName, lineNumber);
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