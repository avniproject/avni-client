import RuleRegistry from './RuleRegistry';

const RuleFactory = (programName, entity, type) => (id, metadata) => {
    return (clzz) => {
        RuleRegistry.add(programName, entity, type, {id: id, metadata: metadata, fn: clzz.exec});
    };
};
export default RuleFactory;