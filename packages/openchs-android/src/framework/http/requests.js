import General from "../../utility/General";
import _ from 'lodash';
import AuthenticationError from "../../service/AuthenticationError";
import ServerError from "../../service/ServerError";
import Config from '../Config';
import GlobalContext from "../../GlobalContext";

const ACCEPTABLE_RESPONSE_STATUSES = [200, 201];

const getAuthToken = async  () => {
    const authService = GlobalContext.getInstance().beanRegistry.getService("authService");
    return await authService.getAuthToken();
};

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
        return Promise.reject(new ServerError(`Http ${response.status}`, response));
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

const _addAuthIfRequired = async (request, bypassAuth) => {
    if (bypassAuth) {
        return request;
    }
    const token = await getAuthToken();
    console.log('token', token);
    return Config.ENV === 'dev' ?
        _.merge({}, request, {headers: {"USER-NAME": token}}) :
        _.merge({}, request, {headers: {'AUTH-TOKEN': token}});
};

let _get = (endpoint, bypassAuth) => {
    General.logDebug('Requests', `GET: ${endpoint}`);
    return _addAuthIfRequired(makeHeader("json"), bypassAuth)
        .then((headers) => fetchFactory(endpoint, "GET", headers))
        .then((response) => response.json(), Promise.reject)
};

let _getText = (endpoint, bypassAuth) => {
    General.logDebug('Requests', `Calling getText: ${endpoint}`);
    return _addAuthIfRequired(makeHeader("text"), bypassAuth)
        .then((headers) => fetchFactory(endpoint, "GET", headers , true))
        .then((response) => response.text(), Promise.reject)
};

let _post = (endpoint, file, fetchWithoutTimeout, bypassAuth = false) => {
    const params = _addAuthIfRequired(makeRequest("json", {body: JSON.stringify(file)}), bypassAuth);
    General.logDebug('Requests', `POST: ${endpoint}`);
    return params.then((headers) => fetchFactory(endpoint, "POST", headers, fetchWithoutTimeout))
};

export let post = _post;

export let get = (endpoint, bypassAuth = false) => {
    return _getText(endpoint, bypassAuth);
};

export let getJSON = (endpoint, bypassAuth = false) => {
    return _get(endpoint, bypassAuth);
};
