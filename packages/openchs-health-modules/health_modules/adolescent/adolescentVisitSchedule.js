import _ from '../common';

const encounterSchedule = {
    "Monthly Visit": {earliest: 30, max: 40},
    "Quarterly Visit": {earliest: 90, max: 100},
    "Half Yearly Visit": {earliest: 180, max: 190},
    "Annual Visit": {earliest: 360, max: 370}
};

const getNextScheduledVisits = function (programEnrolment, today, currentEncounter) {

    const encounters = [];

    const currentEncounters = programEnrolment.encounters;

    const addEncounter = function (baseDate, encounterType, name) {
        if (_.encounterExists(currentEncounters, encounterType, name)) return;

        let schedule = encounterSchedule[encounterType];
        console.log(encounterType, name, schedule);
        const earliestDate = _.addDays(baseDate, schedule.earliest);
        const maxDate = _.addDays(baseDate, schedule.max);
        encounters.push({
            name: name,
            encounterType: encounterType,
            earliestDate: earliestDate,
            maxDate: maxDate
        });
        return maxDate;
    };
    //Monthly Encounter
    let monthlyEncounterDueDate = addEncounter(today, "Monthly Visit", "Monthly Visit 1");
    monthlyEncounterDueDate = addEncounter(_.addDays(monthlyEncounterDueDate, 30), "Monthly Visit", "Monthly Visit 2");
    monthlyEncounterDueDate = addEncounter(_.addDays(monthlyEncounterDueDate, 30), "Monthly Visit", "Monthly Visit 3");
    monthlyEncounterDueDate = addEncounter(_.addDays(monthlyEncounterDueDate, 30), "Monthly Visit", "Monthly Visit 4");
    monthlyEncounterDueDate = addEncounter(_.addDays(monthlyEncounterDueDate, 30), "Monthly Visit", "Monthly Visit 5");
    monthlyEncounterDueDate = addEncounter(_.addDays(monthlyEncounterDueDate, 30), "Monthly Visit", "Monthly Visit 6");
    monthlyEncounterDueDate = addEncounter(_.addDays(monthlyEncounterDueDate, 30), "Monthly Visit", "Monthly Visit 7");
    monthlyEncounterDueDate = addEncounter(_.addDays(monthlyEncounterDueDate, 30), "Monthly Visit", "Monthly Visit 8");
    monthlyEncounterDueDate = addEncounter(_.addDays(monthlyEncounterDueDate, 30), "Monthly Visit", "Monthly Visit 9");
    monthlyEncounterDueDate = addEncounter(_.addDays(monthlyEncounterDueDate, 30), "Monthly Visit", "Monthly Visit 10");
    monthlyEncounterDueDate = addEncounter(_.addDays(monthlyEncounterDueDate, 30), "Monthly Visit", "Monthly Visit 11");
    addEncounter(_.addDays(monthlyEncounterDueDate, 30), "Monthly Visit", "Monthly Visit 12");

    //Quarterly Encounter
    let quarterlyEncounterDueDate = addEncounter(today, "Quarterly Visit", "Quarterly Visit 1");
    quarterlyEncounterDueDate = addEncounter(_.addDays(quarterlyEncounterDueDate, 90), "Quarterly Visit", "Quarterly Visit 2");
    quarterlyEncounterDueDate = addEncounter(_.addDays(quarterlyEncounterDueDate, 90), "Quarterly Visit", "Quarterly Visit 3");
    quarterlyEncounterDueDate = addEncounter(_.addDays(quarterlyEncounterDueDate, 90), "Quarterly Visit", "Quarterly Visit 4");

    //Half Yearly Encounter
    let halfYearlyEncounterDueDate = addEncounter(today, "Half Yearly Visit", "Half Yearly Visit 1");
    halfYearlyEncounterDueDate = addEncounter(_.addDays(halfYearlyEncounterDueDate, 180), "Half Yearly Visit", "Half Yearly Visit 2");

    addEncounter(today, "Annual Visit", "Annual Visit");

    return encounters;
};

export {getNextScheduledVisits};
