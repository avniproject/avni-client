import {get as httpGet, post as httpPost} from './requests';
import _ from 'lodash';

class BatchRequest {
    constructor() {
        this.requestQueue = [];
        this.get = this.get.bind(this);
        this.post = this.post.bind(this);
        this.fire = this.fire.bind(this);
    }

    none() {

    }

    get(endpoint, cb, errorHandler) {
        this.requestQueue.push(()=>httpGet(endpoint, cb, errorHandler));
    }

    post(endpoint, filecontents, cb) {
        this.requestQueue.push(()=>httpPost(endpoint, filecontents, cb));
    }

    fire(finalCallback, errorCallback) {
        const callbackQueue = _.fill([finalCallback].concat(new Array(this.requestQueue.length - 1)), this.none, 1);
        const notify = () => callbackQueue.pop()();
        const notifyError = (message)=> {
            callbackQueue[0] = ()=> errorCallback(message);
            notify();
        };
        this.requestQueue.map((request) => request().then(notify).catch(notifyError));
    }
}

export default BatchRequest;