import General from "../../utility/General";
import _ from 'lodash';

const ACCEPTABLE_RESPONSE_STATUSES = [200, 201];

const fetchFactory = (endpoint, method = "GET", params) => {
    console.log(JSON.stringify(params));
    return fetch(endpoint, {"method": method, ...params})
        .then((response) =>
            ACCEPTABLE_RESPONSE_STATUSES.indexOf(parseInt(response.status)) > -1 ?
                Promise.resolve(response) :
                Promise.reject(response));
};

const makeHeader = (type) => new Map([['json', {
    headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
    }
}], ['text', {headers: {'Accept': 'text/plain', 'Content-Type': 'text/plain'}}]]).get(type);

const makeRequest = (type, opts = {}) => Object.assign({...makeHeader(type), ...opts});

const addAuthIfRequired = (request, authToken) => {
    console.log(authToken)
    return _.isEmpty(authToken)? request: _.merge({}, request, {headers: {'X-session-token': authToken}});
};

let _get = (endpoint, authToken) => {
    General.logDebug('Requests', `Calling: ${endpoint}`);
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
    General.logDebug('Requests', `Posting to ${endpoint}`);
    return fetchFactory(endpoint, "POST", params)
};

export let post = _post;

export let get = (endpoint, authToken) => {
    return _getText(endpoint, authToken);
};

export let getJSON = (endpoint, authToken) => {
    return _get(endpoint, authToken);
};