import {getJSON as httpGet, get as httpGetText, post as httpPost, getJSONTimed as httpGetTimed, postTimed as httpPostTimed} from './requests';

class ChainedRequests {
    constructor() {
        this.requestQueue = [];
    }

    addText(endpoint) {
        return () => httpGetText(endpoint);
    }

    push(request) {
        this.requestQueue.push(request);
    }

    get(endpoint, onComplete) {
        return () => httpGet(endpoint).then(onComplete);
    }

    post(endpoint, filecontents, onComplete) {
        return () => httpPost(endpoint, filecontents).then(onComplete);
    }

    getTimed(endpoint, onComplete) {
        return () => httpGetTimed(endpoint).then(({body, timings}) => onComplete(body, timings));
    }

    postTimed(endpoint, filecontents, onComplete) {
        return () => httpPostTimed(endpoint, filecontents).then(({timings}) => onComplete(timings));
    }

    fire() {
        return this.requestQueue.reduce((acc, request) => acc.then(request), Promise.resolve());
    }
}

export default ChainedRequests;
