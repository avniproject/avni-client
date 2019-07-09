import Individual from "../../src/Individual";
import General from "../../src/utility/General";
import Gender from "../../src/Gender";
import EntityFactory from "../EntityFactory";
import moment from "moment";

export default class IndividualBuilder {
    constructor(data = {concepts: []}) {
        this.individual = new Individual();
        this.individual.uuid = General.randomUUID();
        this.individual.observations = [];
        this.concepts = data.concepts;
        this._getConcept = this._getConcept.bind(this);
    }

    _getConcept(conceptName) {
        return this.concepts.find(c => c.name.trim() === conceptName);
    }

    withName(firstName, lastName) {
        this.individual.firstName = firstName;
        this.individual.lastName = lastName;
        return this;
    }

    withUUID(uuid) {
        this.individual.uuid = uuid;
        return this;
    }

    withAge(age) {
        this.individual.dateOfBirth = moment(new Date()).subtract(age, 'years').toDate();
        return this;
    }

    withGender(gender) {
        this.individual.gender = Gender.create(gender);
        return this;
    }

    withSingleCodedObservation(conceptName, value) {
        let conceptAnswer = this._getConcept(value);
        let concept = this._getConcept(conceptName);
        let obs = EntityFactory.createObservation(concept, conceptAnswer.uuid);
        obs.valueJSON = JSON.stringify({answer: conceptAnswer.uuid});
        this.individual.observations.push(obs);
        return this;
    }

    withMultiCodedObservation(conceptName, values) {
        let conceptAnswers = values.map(this._getConcept).map(c => c.uuid);
        let concept = this._getConcept(conceptName);
        let obs = EntityFactory.createObservation(concept, conceptAnswers);
        obs.valueJSON = JSON.stringify({answer: conceptAnswers});
        this.individual.observations.push(obs);
        return this;
    }

    build() {
        return this.individual;
    }
}