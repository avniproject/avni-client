const fetchFactory = (endpoint, method = "GET", params) => fetch(endpoint, {"method": method, ...params});

const makeHeader = (type) => new Map([['json', {
    headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
    }
}], ['text', {headers: {'Accept': 'text/plain', 'Content-Type': 'text/plain'}}]]).get(type);


let _get = (endpoint, cb, errorHandler) => {
    return fetchFactory(endpoint, "GET", makeHeader("json"))
        .then((response) => {
            return response.json();
        })
        .then(cb)
        .catch(errorHandler);
};

let _getText = (endpoint, cb, errorHandler) => {
    return fetchFactory(endpoint, "GET", makeHeader("text"))
        .then((response) => {
            return response.text();
        })
        .then(cb)
        .catch(errorHandler);
};

let _post = (endpoint, file, cb) => {
    console.log(`Posting To ${endpoint}`);
    return fetchFactory(endpoint, "POST", {body: file})
        .then(cb)
        .catch((message) => console.log(`Calling ${endpoint} gave error: ${message}`));
};

export let post = _post;

export let get = (endpoint, cb, errorHandler) => {
    console.log(`Calling ${endpoint}`);
    return new Map([[true, _get], [false, _getText]]).get(endpoint.endsWith(".json"))(endpoint, cb, errorHandler);
};