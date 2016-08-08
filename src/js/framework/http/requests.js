let _get = (endpoint, cb) => {
    console.log(`Calling ${endpoint}`);
    fetch(endpoint, {
        "method": "GET",
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        }
    })
        .then((response) => {
          return response.json();
        })
        .then(cb)
        .catch((message) => console.log(`Calling ${endpoint} gave error: ${message}`));
};

let _getText = (endpoint, cb) => {
    console.log(`Calling ${endpoint}`);
    fetch(endpoint, {
        "method": "GET",
        headers: {
            'Accept': 'text/plain',
            'Content-Type': 'text/plain'
        }
    })
        .then((response) => {
          return response.text();
        })
        .then(cb)
        .catch((message) => console.log(`Calling ${endpoint} gave error: ${message}`));
};

let _post = (endpoint, file, cb) => {
    console.log(`Calling ${endpoint}`);
    fetch(endpoint, {
        "method": "POST",
        "body": file
    })
        .then((response) => cb())
        .catch((message) => console.log(`Calling ${endpoint} gave error: ${message}`));
};

export let post = _post;

export let get = (endpoint, cb) => {
    return new Map([[true, _get], [false, _getText]]).get(endpoint.endsWith(".json"))(endpoint, cb);
};