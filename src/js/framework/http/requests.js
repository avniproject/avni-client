export let get = (endpoint, cb) => {
    fetch("endpoint", {
        "method": "GET",
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        }
    })
        .then((response) => response.json())
        .then(cb);
};