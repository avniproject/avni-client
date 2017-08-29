import {getJSON as httpGet, get as httpGetText, post as httpPost} from './requests';
import _ from 'lodash';

class BatchRequest {
    constructor() {
        this.requestQueue = [];
        this.add = this.add.bind(this);
        this.post = this.post.bind(this);
        this.fire = this.fire.bind(this);
    }

    none() {

    }

    addText(endpoint, cb, errorHandler) {
        this.requestQueue.push(() => httpGetText(endpoint, cb, errorHandler));
    }

    add(endpoint, cb, errorHandler) {
        this.requestQueue.push(() => httpGet(endpoint, cb, errorHandler));
    }

    post(endpoint, filecontents, cb, errorHandler) {
        this.requestQueue.push(() => httpPost(endpoint, filecontents, cb, errorHandler));
    }

    fire(finalCallback, errorCallback) {
        if (_.isEmpty(this.requestQueue)) return finalCallback();
        const callbackQueue = _.fill([finalCallback].concat(new Array(this.requestQueue.length - 1)), this.none, 1);
        const notify = () => callbackQueue.pop()();
        const notifyError = (message) => {
            callbackQueue[0] = () => errorCallback(message);
            notify();
        };
        this.requestQueue.map((request) => request().then(notify).catch(notifyError));
    }
}

export default BatchRequest;