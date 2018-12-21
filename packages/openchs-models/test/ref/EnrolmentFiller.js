import EntityFactory from "../EntityFactory";
import General from "../../src/utility/General";

export default class EnrolmentFiller {
    constructor(programData, individual, enrolmentDateTime = new Date()) {
        this.enrolment = EntityFactory.createEnrolment({
            enrolmentDateTime: enrolmentDateTime,
            program: programData,
            individual: individual
        });
        this.concepts = programData.concepts;
        this.observations = [];
        this._getConcept = this._getConcept.bind(this);
    }

    _getConcept(conceptName) {
        return this.concepts.find(c => c.name.trim() === conceptName);
    }

    __createNewConcept(conceptName, dataType = "NA") {
        return EntityFactory.createConcept(conceptName, dataType, General.randomUUID())
    }

    forConcept(conceptName, value) {
        let concept = this._getConcept(conceptName) || this.__createNewConcept(conceptName);
        let obs = EntityFactory.createObservation(concept, value);
        this.observations.push(obs);
        return this;
    }

    forSingleCoded(conceptName, value) {
        let conceptAnswer = this._getConcept(value) || this.__createNewConcept(conceptName);
        let concept = this._getConcept(conceptName) || this.__createNewConcept(conceptName, "Coded");
        let obs = EntityFactory.createObservation(concept, conceptAnswer.uuid);
        obs.valueJSON = JSON.stringify({answer: conceptAnswer.uuid});
        this.observations.push(obs);
        return this;
    }

    forMultiCoded(conceptName, value) {
        let conceptAnswers = value.map(this._getConcept).map(c => c.uuid);
        let concept = this._getConcept(conceptName);
        let obs = EntityFactory.createObservation(concept, conceptAnswers);
        obs.valueJSON = JSON.stringify({answer: conceptAnswers});
        this.observations.push(obs);
        return this;
    }

    build() {
        this.enrolment.observations = this.observations;
        return this.enrolment;
    }
}