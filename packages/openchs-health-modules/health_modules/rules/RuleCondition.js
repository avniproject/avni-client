import FormRuleChain from "./RuleChain";
import _ from "lodash";
import moment from "moment";

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

    _look(item) {
        return this._addToChain((next, context) => {
            return next(context);
        });
    }

    _obsFromEntireEnrolment(enrolment, concept) {
        return enrolment.findObservationInEntireEnrolment(concept);
    }

    _obsFromEnrolment(enrolment, concept) {
        return enrolment.findObservation(concept);
    }

    _obsFromExit(enrolment, concept) {
        return enrolment.findExitObservation(concept);
    }

    _getEnrolment(context) {
        return context.programEnrolment || context.programEncounter.programEnrolment;
    }

    _getIndividual(context) {
        return context.individual || this._getEnrolment(context).individual;
    }

    _containsAnswerConceptName(conceptName, context) {
        const answerConcept = context.obsToBeChecked.concept.getPossibleAnswerConcept(conceptName);
        const answerUuid = answerConcept && answerConcept.concept.uuid;
        return context.obsToBeChecked.getValueWrapper().hasValue(answerUuid);
    }

    _hasCodedObs(context) {
        return context.obsToBeChecked && context.obsToBeChecked.concept.isCodedConcept();
    }

    _contextualTime(context) {
        return moment(_.get(context, 'programEncounter.encounterDateTime')
            || _.get(context, 'programEnrolment.enrolmentDateTime')
            || new Date());
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
            context.obsToBeChecked = obs;
            context.valueToBeChecked = obs && obs.getValue();
            return next(context);
        });
    }

    latestValueInAllEncounters(conceptName) {
        return this._addToChain((next, context) => {
            const enrolment = this._getEnrolment(context);
            const obs = enrolment.findLatestObservationFromEncounters(conceptName, context.programEncounter);
            context.obsToBeChecked = obs;
            context.valueToBeChecked = obs && obs.getValue();
            return next(context);
        });
    }

    latestValueInPreviousEncounters(conceptName) {
        return this._addToChain((next, context) => {
            const obs = this._getEnrolment(context).findLatestObservationFromPreviousEncounters(conceptName, context.programEncounter);
            context.obsToBeChecked = obs;
            context.valueToBeChecked = obs && obs.getValue();
            return next(context);
        });
    }

    valueInEnrolment(conceptName) {
        return this._addToChain((next, context) => {
            const obs = this._obsFromEnrolment(this._getEnrolment(context), conceptName);
            context.obsToBeChecked = obs;
            context.valueToBeChecked = obs && obs.getValue();
            return next(context);
        });
    }

    valueInExit(conceptName) {
        return this._addToChain((next, context) => {
            const obs = this._obsFromExit(this._getEnrolment(context), conceptName);
            context.obsToBeChecked = obs;
            context.valueToBeChecked = obs && obs.getValue();
            return next(context);
        });
    }

    get male() {
        return this._addToChain((next, context) => {
            context.matches = this._getIndividual(context).gender.name === "Male";
            return next(context);
        });
    }

    get female() {
        return this._addToChain((next, context) => {
            context.matches = this._getIndividual(context).gender.name === "Female";
            return next(context);
        });
    }

    get addressType() {
        return this._addToChain((next, context) => {
            context.valueToBeChecked = this._getIndividual(context).lowestAddressLevel.type;
            return next(context);
        })
    }

    get age() {
        return this._addToChain((next, context) => {
            context.valueToBeChecked = this._contextualTime().diff(moment(this._getIndividual(context).dateOfBirth));
            return next(context);
        });
    }

    valueInEncounter(conceptName) {
        return this._addToChain((next, context) => {
            const obs = context.programEncounter.findObservation(conceptName);
            context.obsToBeChecked = obs;
            context.valueToBeChecked = obs && obs.getValue();
            return next(context);
        });
    }

    containsAnswerConceptName(conceptName) {
        return this._addToChain((next, context) => {
            if (!this._hasCodedObs(context)) {
                context.matches = false;
                return next(context);
            }

            context.matches = this._containsAnswerConceptName(conceptName, context);
            return next(context);
        });
    }

    containsAnyAnswerConceptName(...conceptNames) {
        return this._addToChain((next, context) => {
            if (!this._hasCodedObs(context)) {
                context.matches = false;
                return next(context);
            }

            context.matches = _.some(conceptNames, (conceptName) => this._containsAnswerConceptName(conceptName, context));
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
            context.matches = fn(context.valueToBeChecked) ? true : false;
            return next(context);
        });
    }

    get truthy() {
        return this._addToChain((next, context) => {
            context.matches = context.valueToBeChecked ? true : false;
            return next(context);
        });
    }

    lessThan(value, unitIfDate) {
        return this._addToChain((next, context) => {
            if (unitIfDate) {
                context.matches = moment.duration(context.valueToBeChecked) < moment.duration(value, unitIfDate);
            }

            context.matches = context.valueToBeChecked < value;
            return next(context);
        });
    }

    lessThanOrEqualTo(value, unitIfDate) {
        return this._addToChain((next, context) => {
            if (unitIfDate) {
                context.matches = moment.duration(context.valueToBeChecked) <= moment.duration(value, unitIfDate);
            }

            context.matches = context.valueToBeChecked <= value;
            return next(context);
        });
    }

    greaterThan(value, unitIfDate) {
        return this._addToChain((next, context) => {
            if (unitIfDate) {
                context.matches = moment.duration(context.valueToBeChecked) > moment.duration(value, unitIfDate);
            }

            context.matches = context.valueToBeChecked > value;
            return next(context);
        });
    }

    greaterThanOrEqualTo(value, unitIfDate) {
        return this._addToChain((next, context) => {
            if (unitIfDate) {
                context.matches = moment.duration(context.valueToBeChecked) >= moment.duration(value, unitIfDate);
            }

            context.matches = context.valueToBeChecked >= value;
            return next(context);
        });
    }

    then(fn) {
        if (this.matches()) {
            return fn();
        }
    }
}