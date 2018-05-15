import _ from 'lodash';
import RuleCondition from "./RuleCondition";

export default class AdditionalComplicationBuilder {

    constructor(context) {
        this.context = context;
        this.complicationCondition = undefined;
    }

    addComplication(complicationConcept) {
        const ruleCondition = new RuleCondition(this.context);
        this.complicationCondition = {concept: complicationConcept, condition: ruleCondition};
        return ruleCondition;
    }

    getComplications() {
        let decision = {name: this.context.complicationsConcept, value: []};
        if (this.complicationCondition.condition.matches()) {
            decision = _.compact([this.context.decisions
                .find(decision => decision.name === this.context.complicationsConcept),
                decision]);
            decision.value = _.uniq([...decision.value, this.complicationCondition.concept]);
        }
        return decision;
    }

    hasComplications() {
        return !_.isEmpty(this.getComplications().value);
    }
}