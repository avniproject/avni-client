class Registry {
    constructor() {
        this.entities = new Set();
    }

    register(name, entity) {
        this.entities.add([name, entity]);
    }

    getEntity(name) {
        return this.entities.get(name);
    }
}

export default Registry;