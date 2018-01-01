import RuleCondition from "./RuleCondition";

export default class VisitScheduleBuilder {
    constructor(context) {
        this.context = context;
        this.scheduledVisits = [];
    }

    add(schedule) {
        const ruleCondition = new RuleCondition(this.context);
        this.scheduledVisits.push({
            data: schedule,
            condition: ruleCondition
        });
        return ruleCondition;
    }

    getAll() {
        return this.scheduledVisits.filter(visit => visit.condition.matches())
            .map(({data}) => data);
    }
}