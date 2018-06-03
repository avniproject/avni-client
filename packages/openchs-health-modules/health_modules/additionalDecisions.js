import * as additionalMotherFns from './mother/additionalDecisions';
import RuleRegistry from '../../rules-config/src/rules/additional/RuleRegistry';

let allRules = RuleRegistry.getAllRules();
console.log(allRules);