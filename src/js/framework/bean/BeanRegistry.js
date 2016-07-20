import Registry from '../Registry';
import _ from 'lodash';

class BeanRegistry extends Registry {
    constructor() {
        super();
        this.getBean = this.getEntity;
    }

    init(db, beanStore) {
        const beans = new Map(Array.from(this.entities).map(([name, bean]) => [name, new bean(db, beanStore)]));
        _.map(Array.from(beans.entries()), ([name, bean]) => bean.init(beans));
        return beans;
    }
}

export default new BeanRegistry();