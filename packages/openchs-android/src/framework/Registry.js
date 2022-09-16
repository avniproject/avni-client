class Registry {
    constructor() {
        this._beanClasses = new Set();
    }

    register(name, beanClass) {
        this._beanClasses.add([name, beanClass]);
    }

    getBeanClass(name) {
        return this._beanClasses.get(name);
    }
}

export default Registry;
