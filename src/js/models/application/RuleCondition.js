import FormRuleChain from "./RuleChain";
import _ from "lodash";
export default class RuleCondition {

    constructor(context) {
        this.context = _.merge(context, {matches: true});
        this.chain = new FormRuleChain();
    }

    _noop() {
        return this._addToChain((next, context) => next(context));
    }

    _addToChain(fn) {
        this.chain.add(fn);
        return this;
    }

    _obsFromEntireEnrolment(enrolment, concept) {
        return enrolment.findObservationInEntireEnrolment(concept);
    }

    _getEnrolment(context) {
        return context.programEnrolment || context.programEncounter.programEnrolment;
    }

    get is() {
        return this._noop();
    }

    get when() {
        return this._noop();
    }

    get not() {
        return this._addToChain((next, context) => {
            let contextFromChain = next(context);
            return _.merge(contextFromChain, {matches: !contextFromChain.matches});
        });
    }

    get and() {
        return this._addToChain((next, context) => {
            const currentMatches = context.matches;
            let contextFromChain = next(context);
            return _.merge(contextFromChain, {matches: contextFromChain.matches && currentMatches});
        });
    }

    get or() {
        return this._addToChain((next, context) => {
            const currentMatches = context.matches;
            let contextFromChain = next(context);
            return _.merge(contextFromChain, {matches: contextFromChain.matches || currentMatches});
        });
    }

    matches() {
        this.context = this.chain.execute(this.context);
        return this.context.matches;
    }

    whenItem(item) {
        return this._addToChain((next, context) => {
            context.valueToBeChecked = item;
            return next(context);
        });
    }

    get filledAtleastOnceInEntireEnrolment() {
        return this._addToChain((next, context) => {
            context.matches = this._obsFromEntireEnrolment(this._getEnrolment(context), context.conceptName) ? true : false;
            return next(context);
        })
    }

    valueInEntireEnrolment(conceptName) {
        return this._addToChain((next, context) => {
            const obs = this._obsFromEntireEnrolment(this._getEnrolment(context), conceptName);
            context.valueToBeChecked = obs && obs.getValue();
            return next(context);
        });
    }

    valueInEncounter(conceptName) {
        return this._addToChain((next, context) => {
           const obs = context.programEncounter.findObservation(conceptName);
           context.valueToBeChecked = obs && obs.getValue();
           return next(context);
        });
    }

    equals(value) {
        return this._addToChain((next, context) => {
            context.matches = context.valueToBeChecked === value;
            return next(context);
        });
    }

    matchesFn(fn) {
        return this._addToChain((next, context) => {
           context.matches = fn(context.valueToBeChecked)? true: false;
           return next(context);
        });
    }

    get truthy() {
        return this._addToChain((next, context) => {
            context.matches = context.valueToBeChecked ? true: false;
            return next(context);
        });
    }

    lessThan(value) {
        return this._addToChain((next, context) => {
            context.matches = context.valueToBeChecked < value;
            return next(context);
        });
    }

    greaterThan(value) {
        return this._addToChain((next, context) => {
            context.matches = context.valueToBeChecked > value;
            return next(context);
        });
    }
}