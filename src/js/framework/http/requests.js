let _get = (endpoint, cb) => {
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

let _post = (endpoint, file, cb) => {
    console.log(endpoint);
    fetch(endpoint, {
        "method": "POST",
        "body": file
    })
        .then((response) => cb());
};

export let post = _post;

export let get = (endpoint, cb) => {
    console.log(endpoint);
    return new Map([[true, _get], [false, _getText]]).get(endpoint.endsWith(".json"))(endpoint, cb);
};