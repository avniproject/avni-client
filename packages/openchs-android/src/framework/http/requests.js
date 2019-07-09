import General from "../../utility/General";
import _ from 'lodash';
import AuthenticationError from "../../service/AuthenticationError";
import ServerError from "../../service/ServerError";

const ACCEPTABLE_RESPONSE_STATUSES = [200, 201];

const fetchFactory = (endpoint, method = "GET", params) => {
    return fetchWithTimeOut(endpoint, {"method": method, ...params})
        .then((response) =>
        {
            if (ACCEPTABLE_RESPONSE_STATUSES.indexOf(parseInt(response.status)) > -1) {
                return Promise.resolve(response);
            }
            if (parseInt(response.status) === 403) {
                General.logError("requests", response);
                return Promise.reject(new AuthenticationError('Http 403', response));
            }
                return Promise.reject(new ServerError(response));
        });
};

const fetchWithTimeOut = (url, options, timeout = 60000) => {
    return Promise.race([
        fetch(url, options),
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error("syncTimeoutError")), timeout)
        )
    ]);
};

const makeHeader = (type) => new Map([['json', {
    headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
    }
}], ['text', {headers: {'Accept': 'text/plain', 'Content-Type': 'text/plain'}}]]).get(type);

const makeRequest = (type, opts = {}) => _.assignIn({...makeHeader(type), ...opts});

const addAuthIfRequired = (request, authToken) => {
    return _.isEmpty(authToken)? request: _.merge({}, request, {headers: {'AUTH-TOKEN': authToken}});
};

let _get = (endpoint, authToken) => {
    General.logDebug('Requests', `GET: ${endpoint}`);
    return fetchFactory(endpoint, "GET", addAuthIfRequired(makeHeader("json"), authToken))
        .then((response) => response.json(), Promise.reject)
};

let _getText = (endpoint, authToken) => {
    General.logDebug('Requests', `Calling getText: ${endpoint}`);
    return fetchFactory(endpoint, "GET", addAuthIfRequired(makeHeader("text"), authToken))
        .then((response) => response.text(), Promise.reject)
};

let _post = (endpoint, file, authToken) => {
    const params = addAuthIfRequired(makeRequest("json", {body: JSON.stringify(file)}), authToken);
    General.logDebug('Requests', `POST: ${endpoint}`);
    return fetchFactory(endpoint, "POST", params)
};

export let post = _post;

export let get = (endpoint, authToken) => {
    return _getText(endpoint, authToken);
};

export let getJSON = (endpoint, authToken) => {
    return _get(endpoint, authToken);
};
