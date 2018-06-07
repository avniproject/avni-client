import {assert} from "chai";
import * as rules from './additional/Rulez';
import RuleRegistry from '../src/rules/additional/RuleRegistry';
console.log(rules);
describe('Additional Rules Test', () => {
    it('should get all additional rules for a given program, entity type and type of rule', function () {
        const allRules = RuleRegistry.getAllRulesFor("random", "ProgramEncounter", "decisions");
        let ruleExecOutput = allRules.map(({fn}, idx) => fn(String(idx)));
        assert.deepEqual(["Rule 2 - 0", "Rule 1 - 1"], ruleExecOutput);
    });
});
