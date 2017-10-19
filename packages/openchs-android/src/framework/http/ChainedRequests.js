import {getJSON as httpGet, get as httpGetText, post as httpPost} from './requests';
import _ from 'lodash';

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

    fire() {
        return this.requestQueue.reduce((acc, request) => acc.then(request), Promise.resolve());
    }
}

export default ChainedRequests;