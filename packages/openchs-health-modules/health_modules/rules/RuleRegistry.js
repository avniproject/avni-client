class RuleRegistry {
    constructor() {
        this.rules = new Map();
    }

    add(name, rule) {
        this.rules.set(name, rule);
    }
}

export default new RuleRegistry();