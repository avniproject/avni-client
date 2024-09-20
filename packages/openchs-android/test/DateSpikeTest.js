import moment from 'moment';

const scheduledOrCompletedEncountersOfType = function (nextVisitDate) {
    const nextDateMonth = moment(nextVisitDate).month();
    const nextDateYear = moment(nextVisitDate).year();

    const data = [{earliestVisitDateTime: new Date("2024-06-30T18:30:00.000Z")}].filter((enc) =>
        moment(enc.earliestVisitDateTime).year() === nextDateYear &&
        moment(enc.earliestVisitDateTime).month() === nextDateMonth
    );
    return data;
};

it('should ', function () {
    const date = new Date("2024-06-30T18:30:00.000Z");
    // console.log(moment(date).month());
    // console.log(scheduledOrCompletedEncountersOfType(date));
    let date2 = moment(date).add(1, 'M').startOf('month').toDate();
    console.log(date2);
    // console.log("to server", JSON.stringify(date2));
});
