import EntityFactory from "../EntityFactory";

export default class EncounterFiller {
    constructor(programData, enrolment, encounterType, encounterDateTime = new Date()) {
        this.enrolment = enrolment;
        this.programEnrolment = enrolment;
        this.programEncounter = EntityFactory.createProgramEncounter({
            programEnrolment: enrolment,
            encounterType: encounterType,
            encounterDateTime: encounterDateTime
        });
        this.concepts = programData.concepts;
        this.observations = [];
        this._getConcept = this._getConcept.bind(this);
    }

    _getConcept(conceptName) {
        return this.concepts.find(c => c.name.trim() === conceptName);
    }

    forConcept(conceptName, value) {
        let concept = this._getConcept(conceptName);
        let obs = EntityFactory.createObservation(concept, value);
        this.observations.push(obs);
        return this;
    }

    forSingleCoded(conceptName, value) {
        let conceptAnswer = this._getConcept(value);
        let concept = this._getConcept(conceptName);
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
        this.programEncounter.observations = this.observations;
        this.enrolment.encounters.push(this.programEncounter);
        return this.programEncounter;
    }
}