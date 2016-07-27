export default class BaseService {
    constructor(db, beanStore) {
        this.db = db;
        this.beanStore = beanStore;
        this.init = this.init.bind(this);
    }

    init() {

    }

    getService(name) {
        return this.beanStore.getBean(name);
    }
}