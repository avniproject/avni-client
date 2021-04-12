import Registry from '../Registry';

class BeanRegistry extends Registry {
    constructor() {
        super();
        this.getBean = this.getEntity;
    }

    init(db) {
        this.entities = Array.from(this.entities).reduce((map, [name, beanClass]) => {
            const beanInstance = new beanClass(db, this);
            map.set(beanClass, beanInstance);
            map.set(name, beanInstance);
            return map;
        }, new Map());
        new Set(this.entities.values()).forEach(bean => bean.init());
        return this.entities;
    }

    get beans() {
        return this.entities;
    }

    updateDatabase(db) {
        new Set(this.entities.values()).forEach(bean => bean.updateDatabase(db));
    }

    setReduxStore(reduxStore) {
        this.entities.forEach(bean => bean.setReduxStore(reduxStore));
    }

    getService(service) {
        return this.entities.get(service);
    }
}

export default new BeanRegistry();