import {getJSON as httpGet, get as httpGetText, post as httpPost} from './requests';
import _ from 'lodash';

class ChainedRequests {
    constructor() {
        this.requestQueue = [];
        this.add = this.add.bind(this);
        this.post = this.post.bind(this);
        this.fire = this.fire.bind(this);
    }

    addText(endpoint, cb) {
        this.requestQueue.push(() => httpGetText(endpoint).then(cb, Promise.reject));
    }


    add(endpoint, cb) {
        this.requestQueue.push(() => httpGet(endpoint).then(cb, Promise.reject));
    }

    post(endpoint, filecontents, cb) {
        this.requestQueue.push(() => httpPost(endpoint, filecontents).then(cb, Promise.reject));
    }

    fire(finalCallback, errorCallback) {
        if (_.isEmpty(this.requestQueue)) return finalCallback();
        this.requestQueue.reduce((acc, request) => acc.then(request), Promise.resolve())
            .then(finalCallback, errorCallback);
    }
}

export default ChainedRequests;