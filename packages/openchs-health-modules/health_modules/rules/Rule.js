import RuleRegistry from './RuleRegistry';

export default function Rule(name) {
    return (fn) => {
        RuleRegistry.add(name, fn);
    };
}