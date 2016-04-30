class BeanRegistry {

    beans = new Set();

    register(name, bean) {
        this.beans.add([name, bean]);
    }

    init(db) {
        return new Map(Array.from(this.beans).map(([name, bean]) => [name, new bean(db)]));
    }
}

export default new BeanRegistry();