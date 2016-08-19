import {get as httpGet, post as httpPost} from './requests';
import _ from 'lodash';

class BatchRequest {
    constructor() {
        this.requestQueue = [];
        this.get = this.get.bind(this);
        this.post = this.post.bind(this);
        this.fire = this.fire.bind(this);
    }

    get(endpoint, cb) {
        this.requestQueue.push(()=>httpGet(endpoint, cb));
    }

    post(endpoint, filecontents, cb) {
        this.requestQueue.push(()=>httpPost(endpoint, filecontents, cb));
    }

    fire(finalCallback) {
        const callbackQueue = _.fill([finalCallback].concat(new Array(this.requestQueue.length - 1)), ()=> {}, 1);
        this.requestQueue.map((request) => request().then(() => callbackQueue.pop()()));
    }
}

export default BatchRequest;