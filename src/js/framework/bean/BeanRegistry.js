import Registry from '../Registry';

class BeanRegistry extends Registry {
    constructor() {
        super();
        this.getBean = this.getEntity;
    }

    init(db, beanStore) {
        return new Map(Array.from(this.entities).map(([name, bean]) => [name, new bean(db, beanStore)]));
    }
}

export default new BeanRegistry();