let _get = (endpoint, cb) => {
    console.log(endpoint);
    fetch(endpoint, {
        "method": "GET",
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        }
    })
        .then((response) => response.json())
        .then(cb);
};

let _getText = (endpoint, cb) => {
    console.log(endpoint);
    fetch(endpoint, {
        "method": "GET",
        headers: {
            'Accept': 'text/plain',
            'Content-Type': 'text/plain'
        }
    })
        .then((response) => response.text())
        .then(cb);
};

export let get = (endpoint, cb) => {
    return new Map([[true, _get], [false, _getText]]).get(endpoint.endsWith(".json"))(endpoint, cb);
};