import General from "../../utility/General";
import _ from 'lodash';
import AuthenticationError from "../../service/AuthenticationError";
import ServerError from "../../service/ServerError";
import Config from '../Config';

const ACCEPTABLE_RESPONSE_STATUSES = [200, 201];

const fetchFactory = (endpoint, method = "GET", params, fetchWithoutTimeout) => {
    const processResponse = (response) => {
        if (ACCEPTABLE_RESPONSE_STATUSES.indexOf(parseInt(response.status)) > -1) {
            return Promise.resolve(response);
        }
        if (parseInt(response.status) === 403) {
            General.logError("requests", response);
            return Promise.reject(new AuthenticationError('Http 403', response));
        }
        if (parseInt(response.status) === 400) {
            return Promise.reject(response);
        }
        return Promise.reject(new ServerError(response));
    };
    return fetchWithoutTimeout ? fetch(endpoint, {"method": method, ...params}).then(processResponse) :
        fetchWithTimeOut(endpoint, {"method": method, ...params}).then(processResponse);
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
    if (Config.ENV === 'dev' || _.isEmpty(authToken)) {
        return _.merge({}, request, {headers: {"USER-NAME": authToken}});
    } else {
        return _.merge({}, request, {headers: {'AUTH-TOKEN': authToken}});
    }
    return request;
}

let _get = (endpoint, authToken) => {
    General.logDebug('Requests', `GET: ${endpoint}`);
    return fetchFactory(endpoint, "GET", addAuthIfRequired(makeHeader("json"), authToken))
        .then((response) => response.json(), Promise.reject)
};

let _getText = (endpoint, authToken) => {
    General.logDebug('Requests', `Calling getText: ${endpoint}`);
    return fetchFactory(endpoint, "GET", addAuthIfRequired(makeHeader("text"), authToken), true)
        .then((response) => response.text(), Promise.reject)
};

let _post = (endpoint, file, authToken, fetchWithoutTimeout) => {
    const params = addAuthIfRequired(makeRequest("json", {body: JSON.stringify(file)}), authToken);
    General.logDebug('Requests', `POST: ${endpoint}`);
    return fetchFactory(endpoint, "POST", params, fetchWithoutTimeout)
};

export let post = _post;

export let get = (endpoint, authToken) => {
    return _getText(endpoint, authToken);
};

export let getJSON = (endpoint, authToken) => {
    return _get(endpoint, authToken);
};
