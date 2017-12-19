var moment = require('moment');
import {ObservationsHolder, ProgramEncounter, ProgramEnrolment, Encounter, EncounterType, Individual, Gender} from "openchs-models";
import {findConcept} from "./Concepts";

const getObservationValue = function (conceptName) {
    return new ObservationsHolder(this.observations).getObservationReadableValue(findConcept(conceptName));
};

const setObservation = function (conceptName, value) {
    new ObservationsHolder(this.observations).addOrUpdateObservation(findConcept(conceptName), value);
    return this;
};

const observationExists = function (conceptName) {
    return this.observations.some((obs) => obs.concept.name === conceptName);
};

function EncounterFn(encounterTypeName) {
    this.encounter = Encounter.create();
    this.encounter.encounterType = EncounterType.create(encounterTypeName);
    this.encounter.individual = Individual.createEmptyInstance();

    this.individual = this.encounter.individual;

    this.setAge = function (years) {
        this.encounter.individual.setAge(years, true);
        return this;
    };

    this.setGender = function (genderName) {
        this.encounter.individual.gender = Gender.create(genderName);
        return this;
    };

    this.observations = this.encounter.observations;

    this.encounterType = this.encounter.encounterType;

    return this;
}

function Form() {
    this.findFormElement = function (formElementName) {
        return {name: formElementName, uuid: '299eae98-8582-4b1d-9595-35809531c255'};
    }
}

function IndividualFn() {
    return Individual.createEmptyInstance();
}

function ProgramEncounterFn(encounterTypeName, encounterDateTime, encounterName) {
    let programEncounter = ProgramEncounter.createEmptyInstance();
    programEncounter.encounterType = {name: encounterTypeName};
    programEncounter.encounterDateTime = encounterDateTime;
    programEncounter.name = encounterName;
    return programEncounter;
}

function ProgramEnrolmentFn(programName, encounters, individualDateOfBirth) {
    let enrolment = ProgramEnrolment.createEmptyInstance();
    enrolment.program = {name: programName};
    enrolment.encounters = encounters;
    enrolment.individual = new Individual();
    enrolment.individual.dateOfBirth = individualDateOfBirth;
    return enrolment;
}

function Decision(name, value) {
    this.name = name;
    this.value = value;
}

function SingleValueCodedDecision(name, value) {
    this.name = name;
    if (value === undefined) this.value = [];
    else this.value = [value];
}

const prototypes = [ProgramEncounter.prototype, ProgramEnrolment.prototype, EncounterFn.prototype];
prototypes.forEach(function (currentPrototype) {
    currentPrototype.getObservationValue = getObservationValue;
    currentPrototype.setObservation = setObservation;
    currentPrototype.observationExists = observationExists;
});

module.exports = {
    Encounter: EncounterFn,
    ProgramEncounter: ProgramEncounterFn,
    ProgramEnrolment: ProgramEnrolmentFn,
    Individual: IndividualFn,
    Form: Form,
    Decision: Decision,
    SingleValueCodedDecision: SingleValueCodedDecision
};