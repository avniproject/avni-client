import RuleRegistry from './RuleRegistry';

const RuleFactory = (opts) => (id, metadata) => {
    return (fn) => {
        RuleRegistry.add(id, {metadata: {...metadata, ...opts}, fn: fn});
    };
};

export let TreatmentRule = RuleFactory({type: "treatment"});