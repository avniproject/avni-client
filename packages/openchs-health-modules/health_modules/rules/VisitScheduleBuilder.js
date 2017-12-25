import RuleCondition from "./RuleCondition";

export default class VisitScheduleBuilder {
    constructor(context) {
        this.context = context;
        this.scheduledVisits = [];
    }

    add({name, encounterType, earliestDate, maxDate}) {
        const ruleCondition = new RuleCondition(this.context);
        this.scheduledVisits.push({
            data: {
                name: name,
                encounterType: encounterType,
                earliestDate: earliestDate,
                maxDate: maxDate
            },
            condition: ruleCondition
        });
        return ruleCondition;
    }

    getAll() {
        return this.scheduledVisits.filter(visit => visit.condition.matches())
            .map(({data}) => data);
    }
}