import Registry from '../Registry';
import _ from 'lodash';

class BeanRegistry extends Registry {
    init(db) {
        console.log("BeanRegistry", `Initialising registry with ${this._beanClasses.size} bean classes. ${_.isNil(this._beans)}`);
        this._beans = [];
        this._beansMap = Array.from(this._beanClasses).reduce((map, [name, beanClass]) => {
            const beanInstance = new beanClass(db, this);
            map.set(beanClass, beanInstance);
            map.set(name, beanInstance);
            this._beans.push(beanInstance);
            return map;
        }, new Map());
        console.log("BeanRegistry", `Beans map created with ${this._beansMap.size} entries for ${this._beans.length} beans`);
        this._beans.forEach(bean => bean.init());
        console.log("BeanRegistry", `Initialisation completed ${this._beansMap.size} entries`);
    }

    updateDatabase(db) {
        this._beans.forEach(bean => bean.updateDatabase(db));
    }

    setReduxStore(reduxStore) {
        this._beans.forEach(bean => bean.setReduxStore(reduxStore));
    }

    getService(service) {
        return this._beansMap.get(service);
    }

    get beansMap() {
        return this._beansMap;
    }
}

export default BeanRegistry;
