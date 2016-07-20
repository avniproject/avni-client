export default class BaseService {
    constructor(db, beanStore) {
        this.db = db;
        this.beanStore = beanStore;
    }

    init() {

    }

    getService(name) {
        return this.beanStore.getBean(name);
    }
}