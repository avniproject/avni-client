class RuleRegistry {
    constructor() {
        this.rules = new Map();
    }

    add(name, rule) {
        this.rules.set(name, rule);
    }
}


class Registry {
    constructor() {
        this.registryMap = new Map();
    }

    add() {

    }
}


export default new Registry();