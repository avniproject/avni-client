import RuleFactory from '../../src/rules/additional/Rule';

const Rule = RuleFactory("random", "ProgramEncounter", "decisions");


@Rule("3dad9988-1a3a-44c6-85b2-d410bd059b58", {someData: "Goat"})
class rule1Brah {
    static exec(arg) {
        return `Rule 1 - ${arg}`;
    }
}

@Rule("75ea9d77-b951-43f0-84f0-8562eddd330a", {someData: "Cow"})
class rule2Brah {
    static exec(arg) {
        return `Rule 2 - ${arg}`;
    }
}

export {rule1Brah, rule2Brah};