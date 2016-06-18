import BeanRegistry from "../framework/BeanRegistry";

export default class BaseService {
    constructor(db, beanStore) {
        this.db = db;
        this.beanStore = beanStore;
    }

    getService(name) {
        return this.beanStore.getBean(name);
    }
}