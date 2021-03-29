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
}

export default new BeanRegistry();