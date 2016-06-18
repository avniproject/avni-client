class BeanRegistry {

    beans = new Set();

    register(name, bean) {
        this.beans.add([name, bean]);
    }

    init(db, beanStore) {
        return new Map(Array.from(this.beans).map(([name, bean]) => [name, new bean(db, beanStore)]));
    }
    
    getBean(name) {
        return this.beans.get(name);
    }
}

export default new BeanRegistry();