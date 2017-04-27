import General from "../../utility/General";
const fetchFactory = (endpoint, method = "GET", params) => fetch(endpoint, {"method": method, ...params});

const makeHeader = (type) => new Map([['json', {
    headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
    }
}], ['text', {headers: {'Accept': 'text/plain', 'Content-Type': 'text/plain'}}]]).get(type);


let _get = (endpoint, cb, errorHandler) => {
    General.logDebug('Requests', `Calling: ${endpoint}`);
    return fetchFactory(endpoint, "GET", makeHeader("json"))
        .then((response) => {
            return response.json();
        })
        .then(cb)
        .catch(errorHandler);
};

let _getText = (endpoint, cb, errorHandler) => {
    General.logDebug('Requests', `Calling getText: ${endpoint}`);
    return fetchFactory(endpoint, "GET", makeHeader("text"))
        .then((response) => {
            if (!response.ok) {
                General.logError('Requests', `Error for ${endpoint}: ${JSON.stringify(response)}`);
                throw new Error(`HTTP Status: ${response.status}`);
            }
            return response.text();
        })
        .then(cb)
        .catch(errorHandler);
};

let _post = (endpoint, file, cb, errorHandler) => {
    const body = JSON.stringify(file);
    if (General.canLog(General.LogLevel.Debug))
        General.logDebug('Requests', `Posting: ${body} to ${endpoint}`);
    if (errorHandler === undefined) {
        errorHandler = (arg) => {
            General.logDebug('Requests', `Automatically defined error handler: ${arg}`);
        };
    }

    var params = makeHeader("json");
    params.body = body;
    return fetchFactory(endpoint, "POST", params).then(cb).catch(errorHandler);
};

export let post = _post;

export let get = (endpoint, cb, errorHandler) => {
    return _getText(endpoint, cb, errorHandler);
};

export let getJSON = (endpoint, cb, errorHandler) => {
    if (errorHandler === undefined) {
        errorHandler = (arg) => {
            General.logDebug(`Automatically defined error handler: ${arg}`);
        };
    }
    return _get(endpoint, cb, errorHandler);
};