class BeanRegistry {

    components = new Set();

    register(name, bean) {
        this.components.add([name, bean]);
    }

    init(db) {
        return new Map(Array.from(this.components).map(function ([name, bean]) {
            return [name, new bean(db)];
        }));
    }
}

export default new BeanRegistry();