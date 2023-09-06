import General from "../../utility/General";
import _ from 'lodash';
import AuthenticationError from "../../service/AuthenticationError";
import ServerError from "../../service/ServerError";
import GlobalContext from "../../GlobalContext";
import {IDP_PROVIDERS} from "../../model/IdpProviders";
import CookieManager from "@react-native-cookies/cookies";

const ACCEPTABLE_RESPONSE_STATUSES = [200, 201];

const getAuthToken = async () => {
    const authService = GlobalContext.getInstance().beanRegistry.getService("authService");
    return await authService.getAuthProviderService().getAuthToken();
};

const getIdpType = async () => {
    const settingsService = GlobalContext.getInstance().beanRegistry.getService("settingsService");
    return await settingsService.getSettings().idpType;
}

const fetchFactory = (endpoint, method = "GET", params, fetchWithoutTimeout) => {
    const processResponse = (response) => {
        let responseCode = parseInt(response.status);
        if (ACCEPTABLE_RESPONSE_STATUSES.indexOf(responseCode) > -1) {
            return Promise.resolve(response);
        }
        if (responseCode === 403 || responseCode === 401) {
            General.logError("requests", response);
            return Promise.reject(new AuthenticationError('Http ' + responseCode, response));
        }
        if (responseCode === 400) {
            return Promise.reject(response);
        }
        return Promise.reject(new ServerError(`Http ${response.status}`, response));
    };
    const requestInit = {"method": method, ...params};
    const doFetch = getXSRFPromise(endpoint).then((xsrfToken) => {
        requestInit.headers["X-XSRF-TOKEN"] = xsrfToken;
        return fetchWithoutTimeout ? fetch(endpoint, requestInit)
            : fetchWithTimeOut(endpoint, requestInit)
    });
    return doFetch.then(processResponse);
};

const getXSRFPromise = function (endpoint) {
    return CookieManager.get(endpoint).then((cookies) => {
        const xsrfCookieObject = cookies["XSRF-TOKEN"];
        if (_.isNil(xsrfCookieObject)) {
            General.logDebug("requests",`getXSRFPromise: no XSRF cookie found when calling ${endpoint}`);
            return null;
        }
        return xsrfCookieObject.value;
    });
}

const fetchWithTimeOut = (url, options, timeout = 60000) => {
    return Promise.race([
        fetch(url, options),
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error("syncTimeoutError")), timeout)
        )
    ]);
};

const makeHeader = function (type) {
    const jsonRequestHeader = {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
    };
    const textRequestHeader = {'Accept': 'text/plain', 'Content-Type': 'text/plain'};
    return new Map([['json', {headers: jsonRequestHeader}],
        ['text', {headers: textRequestHeader}]]).get(type);
}

const makeRequest = (type, opts = {}) => _.assignIn({...makeHeader(type), ...opts});

const _addAuthIfRequired = async (request, bypassAuth) => {
    if (bypassAuth) {
        return request;
    }
    const [token, idpType] = await Promise.all([getAuthToken(), getIdpType()]);

    return idpType === IDP_PROVIDERS.NONE ?
        _.merge({}, request, {headers: {"USER-NAME": token}}) :
        _.merge({}, request, {headers: {'AUTH-TOKEN': token}});
};

const _get = (endpoint, bypassAuth) => {
    General.logDebug('Requests', `GET: ${endpoint}`);
    return _addAuthIfRequired(makeHeader("json"), bypassAuth)
        .then((headers) => fetchFactory(endpoint, "GET", headers))
        .then((response) => response.json(), Promise.reject)
};

const _getText = (endpoint, bypassAuth) => {
    General.logDebug('Requests', `Calling getText: ${endpoint}`);
    return _addAuthIfRequired(makeHeader("text"), bypassAuth)
        .then((headers) => fetchFactory(endpoint, "GET", headers, true))
        .then((response) => response.text(), Promise.reject)
};

const _post = (endpoint, file, fetchWithoutTimeout, bypassAuth = false) => {
    const params = _addAuthIfRequired(makeRequest("json", {body: JSON.stringify(file)}), bypassAuth);
    General.logDebug('Requests', `POST: ${endpoint}`);
    return params.then((headers) => fetchFactory(endpoint, "POST", headers, fetchWithoutTimeout))
};

const _put = (endpoint, body, fetchWithoutTimeout, bypassAuth = false) => {
    const params = _addAuthIfRequired(makeRequest("json", {body: JSON.stringify(body)}), bypassAuth);
    General.logDebug('Requests', `PUT: ${endpoint}`);
    return params.then((headers) => {
        return fetchFactory(endpoint, "PUT", headers, fetchWithoutTimeout)
    })
};

export const post = _post;

export const get = (endpoint, bypassAuth = false) => {
    return _getText(endpoint, bypassAuth);
};

export const getJSON = (endpoint, bypassAuth = false) => {
    return _get(endpoint, bypassAuth);
};

export const putJSON = (endpoint, body, fetchWithoutTimeout = false, bypassAuth = false) => {
    return _put(endpoint, body, fetchWithoutTimeout, bypassAuth)
};

export const postUrlFormEncoded = (endpoint, body) => {
    const formBody = new URLSearchParams(body).toString();
    return fetchFactory(endpoint, "POST", {headers: {'Content-Type': 'application/x-www-form-urlencoded', 'Accept': '*/*'}, body: formBody}, true)
}
