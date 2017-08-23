import FormRuleChain from "./RuleChain";
import _ from "lodash";
export default class RuleCondition {

    constructor(context) {
        this.context = _.merge(context, {matches: true});
        this.chain = new FormRuleChain();
    }

    noop() {
        return this.addToChain((next, context) => {
            return next(context);
        });
    }

    get is() {
        return this.noop();
    }

    get when() {
        return this.noop();
    }

    get not() {
        return this.addToChain((next, context) => {
            let contextFromChain = next(context);
            return _.merge(contextFromChain, {matches: !contextFromChain.matches});
        });
    }


    get and() {
        return this.addToChain((next, context) => {
            let currentMatches = context.matches;
            let contextFromChain = next(context);
            return _.merge(contextFromChain, {matches: contextFromChain.matches && currentMatches});
        });
    }

    get or() {
        return this.addToChain((next, context) => {
            let currentMatches = context.matches;
            let contextFromChain = next(context);
            return _.merge(contextFromChain, {matches: contextFromChain.matches || currentMatches});
        });
    }

    addToChain(fn) {
        this.chain.add(fn);
        return this;
    }

    matches() {
        this.context = this.chain.execute(this.context);
        return this.context.matches;
    }

    whenItem(item) {
        return this.addToChain((next, context) => {
            context.valueToBeChecked = item;
            return next(context);
        });
    }

    get filledAtleastOnceInEntireEnrolment() {
        return this.addToChain((next, context) => {
            context.matches = this._obsFromEntireEnrolment(context.programEnrolment, context.conceptName) ? true : false;
            return next(context);
        })
    }

    valueInEntireEnrolment(conceptName) {
        return this.addToChain((next, context) => {
            let obs = this._obsFromEntireEnrolment(context.programEnrolment, conceptName);
            context.valueToBeChecked = obs && obs.getValue();
            return next(context);
        });
    }

    equals(value) {
        return this.addToChain((next, context) => {
            context.matches = context.valueToBeChecked === value ;
            return next(context);
        });
    }

    lessThan(value) {
        return this.addToChain((next, context) => {
            context.matches = context.valueToBeChecked < value;
            return next(context);
        });
    }

    greaterThan(value) {
        return this.addToChain((next, context) => {
            context.matches = context.valueToBeChecked > value;
            return next(context);
        });
    }

    _obsFromEntireEnrolment(enrolment, concept) {
        return enrolment.findObservationInEntireEnrolment(concept);
    }
}