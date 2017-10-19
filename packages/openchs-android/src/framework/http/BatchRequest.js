import {getJSON as httpGet, get as httpGetText, post as httpPost} from './requests';

class BatchRequest {
    constructor() {
        this.requestQueue = [];
    }

    addText(endpoint) {
        return () => httpGetText(endpoint);
    }

    push(request) {
        this.requestQueue.push(request);
    }

    get(endpoint) {
        return () => httpGet(endpoint);
    }

    post(endpoint, filecontents) {
        return () => httpPost(endpoint, filecontents);
    }

    fire() {
        return Promise.all(this.requestQueue);
    }
}

export default BatchRequest;