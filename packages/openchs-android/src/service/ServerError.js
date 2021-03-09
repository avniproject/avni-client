function ServerError(code, message, fileName, lineNumber) {
    let instance = new Error(message, fileName, lineNumber);
    instance.errorCode = code;
    instance.errorText = message.text() || Promise.resolve("Unknown server error occurred");

    if (Object.setPrototypeOf) {
        Object.setPrototypeOf(instance, Object.getPrototypeOf(this));
    } else {
        instance.__proto__ = Object.getPrototypeOf(this);
    }
    return instance;
}

ServerError.prototype = Object.create(Error.prototype, {
    constructor: {
        value: Error,
        enumerable: false,
        writable: true,
        configurable: true
    }
});

if (Object.setPrototypeOf){
    Object.setPrototypeOf(ServerError, Error);
} else {
    ServerError.__proto__ = Error;
}

export default ServerError;
