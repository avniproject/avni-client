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
    return fetchFactory(endpoint, "POST", {body: file})
        .then(cb)
};

export let post = _post;

export let get = (endpoint, cb, errorHandler) => {
    return new Map([[true, _get], [false, _getText]]).get(endpoint.endsWith(".json"))(endpoint, cb, errorHandler);
};

export let getJSON = (endpoint, cb, errorHandler) => {
    if (errorHandler === undefined) {
        errorHandler = (arg) => {
            console.log(`Automatically defined error handler: ${arg}`);
        };
    }
    return _get(endpoint, cb, errorHandler);
};