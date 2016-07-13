import Registry from '../Registry';

class BeanRegistry extends Registry {
    init(db, beanStore) {
        return new Map(Array.from(this.entities).map(([name, bean]) => [name, new bean(db, beanStore)]));
    }

    getBean(name) {
        return this.getEntity(name);
    }
}

export default new BeanRegistry();