const fetchFactory = function (endpoint, method = "GET", params) {
    return fetch(endpoint, {
        "method": method,
        ...params
    });
};

let _get = (endpoint, cb) => {
    return fetchFactory(endpoint, "GET", {headers: {'Accept': 'application/json', 'Content-Type': 'application/json'}})
        .then((response) => {
            return response.json();
        })
        .then(cb)
        .catch((message) => console.log(`Calling ${endpoint} gave error: ${message}`));
};

let _getText = (endpoint, cb) => {
    return fetchFactory(endpoint, "GET", {headers: {'Accept': 'text/plain', 'Content-Type': 'text/plain'}})
        .then((response) => {
            return response.text();
        })
        .then(cb)
        .catch((message) => console.log(`Calling ${endpoint} gave error: ${message}`));
};

let _post = (endpoint, file, cb) => {
    console.log(`Posting To ${endpoint}`);
    return fetchFactory(endpoint, "POST", {body: file})
        .then(cb)
        .catch((message) => console.log(`Calling ${endpoint} gave error: ${message}`));
};

export let post = _post;

export let get = (endpoint, cb) => {
    console.log(`Calling ${endpoint}`);
    return new Map([[true, _get], [false, _getText]]).get(endpoint.endsWith(".json"))(endpoint, cb);
};