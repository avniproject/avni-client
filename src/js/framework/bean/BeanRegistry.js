import Registry from '../Registry';
import _ from 'lodash';

class BeanRegistry extends Registry {
    constructor() {
        super();
        this.getBean = this.getEntity;
    }

    init(db, app) {
        this.entities = new Map(Array.from(this.entities).map(([name, beanClass]) => {
            const beanInstance = new beanClass(db, this);
            return [beanClass, beanInstance];
        }));
        _.map(Array.from(this.entities.entries()), ([name, bean]) => bean.init(app));
        return this.entities;
    }
}

export default new BeanRegistry();