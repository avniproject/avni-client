import moment from 'moment';

const scheduledOrCompletedEncountersOfType = function (nextVisitDate) {
    const nextDateMonth = moment(nextVisitDate).month();
    const nextDateYear = moment(nextVisitDate).year();

    return [
        {earliestVisitDateTime: new Date("2024-06-30T18:30:00.000Z")},
        {earliestVisitDateTime: new Date("2024-07-31T18:30:00.000Z")},
        {earliestVisitDateTime: new Date("2024-08-31T18:30:00.000Z")},
    ].filter((enc) =>
        moment(enc.earliestVisitDateTime).year() === nextDateYear &&
        moment(enc.earliestVisitDateTime).month() === nextDateMonth
    );
};

xit('should ', function () {
    // console.log("nextDate", moment(new Date("2024-08-31T18:30:00.000Z")).add(1, 'M').startOf('month').toDate());
    // console.log("nextDate", moment(new Date("2024-08-21T18:30:00.000Z")).add(1, 'M').startOf('month').toDate());

    // perform, should schedule next visit
    let currentEncountersEarliestDate = new Date("2024-08-31T18:30:00.000Z");
    let nextDate = moment(currentEncountersEarliestDate).add(1, 'M').startOf('month').toDate();
    console.log("found visits", scheduledOrCompletedEncountersOfType(nextDate).length, "Next date", nextDate);

    currentEncountersEarliestDate = new Date("2024-08-31T18:30:00.000Z") || new Date("2024-09-05T10:30:00.000Z");
    nextDate = moment(currentEncountersEarliestDate).add(1, 'M').startOf('month').toDate();
    console.log("found visits", scheduledOrCompletedEncountersOfType(nextDate).length, "Next date", nextDate);

    currentEncountersEarliestDate = new Date("2024-07-31T18:30:00.000Z");
    nextDate = moment(currentEncountersEarliestDate).add(1, 'M').startOf('month').toDate();
    console.log("found visits", scheduledOrCompletedEncountersOfType(nextDate).length, "Next date", nextDate);

    console.log("Month", moment(new Date("2024-08-31T18:30:00.000Z")).format("MMMM"));
    console.log("Month", moment(new Date()).month());

    console.log("Month", moment(new Date("2024-01-20T18:30:00.000Z")).format("MMMM"));

    console.log("timezone", new Date().getTimezoneOffset());
});
