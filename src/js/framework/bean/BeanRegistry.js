import Registry from '../Registry';
import _ from 'lodash';

class BeanRegistry extends Registry {
    constructor() {
        super();
        this.getBean = this.getEntity;
    }

    init(db) {
        this.entities = new Map(Array.from(this.entities).map(([name, bean]) => [bean, new bean(db, this)]));
        _.map(Array.from(this.entities.entries()), ([name, bean]) => bean.init());
        return this.entities;
    }
}

export default new BeanRegistry();