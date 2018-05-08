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
        let complications = [];
        if (this.complicationCondition.condition.matches()) {
            const decision = _.compact([this.context.decisions
                .find(decision => decision.name === this.context.complicationsConcept),
                {name: this.context.complicationsConcept, value: []}]);
            complications.value.push(this.complicationCondition.concept);
        }
        return {name: this.context.complicationsConcept, value: _.uniq(complications)};
    }

    hasComplications() {
        return !_.isEmpty(this.getComplications().value);
    }
}