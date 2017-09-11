var moment = require('moment');

const getObservationValue = function (conceptName) {
    return this.observations.get(conceptName);
};
const getObservationValueFromEntireEnrolment = function (conceptName) {
    var value;
    this.encounters.forEach(function (encounter) {
        if (value === undefined) value = encounter.observations.get(conceptName);
    });
    if (value === undefined) return this.observations.get(conceptName);
    return value;
};

const setObservation = function (conceptName, value) {
    this.observations.set(conceptName, value);
    return this;
};

const observationExists = function (conceptName) {
    return this.observations.has(conceptName);
};

const observationExistsInEntireEnrolment = function (conceptName) {
    var obsExists = false;
    this.encounters.forEach(function (encounter) {
        if (encounter.observations.has(conceptName)) obsExists = true;
    });
    if (!obsExists) return this.observations.has(conceptName);
    return obsExists;
};

function Encounter(encounterTypeName) {
    this.observations = new Map();
    this.individual = new Individual();
    this.encounterType = {name: encounterTypeName};

    this.setAge = function (years) {
        this.individual.setAge(years);
        return this;
    };

    this.setGender = function (genderName) {
        this.individual.setGender(genderName);
        return this;
    };
}

function Form() {
    this.findFormElement = function (formElementName) {
        return {name: formElementName, uuid: '299eae98-8582-4b1d-9595-35809531c255'};
    }
}

function Individual() {
    this.setAge = function (years) {
        this.years = years;
    };

    this.setGender = function (genderName) {
        this.gender = {};
        this.gender.name = genderName;
    };

    this.getAgeInYears = function (toDate) {
        return this.years ? this.years : moment(toDate ? toDate : moment.now()).diff(this.dateOfBirth, 'years');
    };
}

function ProgramEncounter(encounterTypeName, encounterDateTime, encounterName) {
    this.encounterType = {name: encounterTypeName};
    this.encounterDateTime = encounterDateTime;
    this.name = encounterName;
    this.observations = new Map();
}

function ProgramEnrolment(programName, encounters, individualDateOfBirth) {
    this.program = {name: programName};
    this.encounters = encounters;
    this.individual = new Individual();
    this.individual.dateOfBirth = individualDateOfBirth;
    this.observations = new Map();
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

const prototypes = [ProgramEncounter.prototype, Encounter.prototype, ProgramEnrolment.prototype];
prototypes.forEach(function (currentPrototype) {
    currentPrototype.getObservationValue = getObservationValue;
    currentPrototype.setObservation = setObservation;
    currentPrototype.observationExists = observationExists;
});
ProgramEnrolment.prototype.observationExistsInEntireEnrolment = observationExistsInEntireEnrolment;
ProgramEnrolment.prototype.getObservationValueFromEntireEnrolment = getObservationValueFromEntireEnrolment;

module.exports = {
    Encounter: Encounter,
    ProgramEncounter: ProgramEncounter,
    ProgramEnrolment: ProgramEnrolment,
    Individual: Individual,
    Form: Form,
    Decision: Decision,
    SingleValueCodedDecision: SingleValueCodedDecision
};