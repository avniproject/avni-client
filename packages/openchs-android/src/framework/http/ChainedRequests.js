import {getJSON as httpGet, get as httpGetText, post as httpPost} from './requests';

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

    get(endpoint, authToken, onComplete) {
        return () => httpGet(endpoint, authToken).then(onComplete);
    }

    post(endpoint, filecontents, authToken, onComplete) {
        return () => httpPost(endpoint, filecontents, authToken).then(onComplete);
    }

    fire() {
        return this.requestQueue.reduce((acc, request) => acc.then(request), Promise.resolve());
    }
}

export default ChainedRequests;