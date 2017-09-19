import General from "../../utility/General";
import _ from 'lodash';

const ACCEPTABLE_RESPONSE_STATUSES = [200, 201];

const fetchFactory = (endpoint, method = "GET", params) => {
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

let _get = (endpoint) => {
    General.logDebug('Requests', `Calling: ${endpoint}`);
    return fetchFactory(endpoint, "GET", makeHeader("json"))
        .then((response) => response.json(), Promise.reject)
};

let _getText = (endpoint) => {
    General.logDebug('Requests', `Calling getText: ${endpoint}`);
    return fetchFactory(endpoint, "GET", makeHeader("text"))
        .then((response) => response.text(), Promise.reject)
};

let _post = (endpoint, file) => {
    const params = makeRequest("json", {body: JSON.stringify(file)});
    General.logDebug('Requests', `Posting to ${endpoint}`);
    return fetchFactory(endpoint, "POST", params)
};

export let post = _post;

export let get = (endpoint) => {
    return _getText(endpoint);
};

export let getJSON = (endpoint) => {
    return _get(endpoint);
};