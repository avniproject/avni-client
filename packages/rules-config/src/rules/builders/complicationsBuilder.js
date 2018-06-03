import _ from 'lodash';
import RuleCondition from "../RuleCondition";

export default class ComplicationsBuilder {

    constructor(context) {
        this.context = context;
        this.complicationConditions = [];
    }

    addComplication(complicationConcept) {
        const ruleCondition = new RuleCondition(this.context);
        this.complicationConditions.push({concept: complicationConcept, condition: ruleCondition});
        return ruleCondition;
    }

    getComplications() {
        let complications = [];
        _.forEach(this.complicationConditions, (conditionObj) => {
            if (conditionObj.condition.matches()) {
                complications.push(conditionObj.concept);
            }
        });
        return {name: this.context.complicationsConcept, value: _.uniq(complications)};
    }

    hasComplications() {
        return !_.isEmpty(this.getComplications().value);
    }
}