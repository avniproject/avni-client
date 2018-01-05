import RuleCondition from "./RuleCondition";
import _ from 'lodash';

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

    removeVisitsWith(key, keyList) {
        this.scheduledVisits = this.scheduledVisits.filter((sv) => keyList.indexOf(_.get(sv, `data.${key}`)) < 0);

    }

    getAllUnique(keyPath) {
        return _.uniqBy(this.getAll(), (visit) => _.get(visit, `data.${keyPath}`));
    }
}