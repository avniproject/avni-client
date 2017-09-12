import C from '../common';

var getVaccSchedule = function (programEnrolment) {
    const vaccScheduleItems = [];
    const dateOfBirth = programEnrolment.individual.dateOfBirth;

    //at birth
    vaccScheduleItems.push(C.addChecklistItem(dateOfBirth, "BCG", 0, 15));
    vaccScheduleItems.push(C.addChecklistItem(dateOfBirth, "OPV 0", 0, 15));
    vaccScheduleItems.push(C.addChecklistItem(dateOfBirth, "HEPB 0", 0, 15));
    //at 6 weeks
    vaccScheduleItems.push(C.addChecklistItem(dateOfBirth, "OPV 1", 42, 42));
    vaccScheduleItems.push(C.addChecklistItem(dateOfBirth, "Pentavalent 1", 42, 42));
    //at 10 weeks
    vaccScheduleItems.push(C.addChecklistItem(dateOfBirth, "OPV 2", 70, 70));
    vaccScheduleItems.push(C.addChecklistItem(dateOfBirth, "Pentavalent 2", 70, 70));
    //at 14 weeks
    vaccScheduleItems.push(C.addChecklistItem(dateOfBirth, "OPV 3", 98, 98));
    vaccScheduleItems.push(C.addChecklistItem(dateOfBirth, "Pentavalent 3", 98, 98));
    vaccScheduleItems.push(C.addChecklistItem(dateOfBirth, "IPV", 98, 98));
    //at 9 months
    vaccScheduleItems.push(C.addChecklistItem(dateOfBirth, "Measles 1", 274, 274));
    vaccScheduleItems.push(C.addChecklistItem(dateOfBirth, "JE 1", 274, 274));
    vaccScheduleItems.push(C.addChecklistItem(dateOfBirth, "Vitamin A 1", 274, 274));
    //between 16 - 24 months
    vaccScheduleItems.push(C.addChecklistItem(dateOfBirth, "Measles 2", 487, 730));
    vaccScheduleItems.push(C.addChecklistItem(dateOfBirth, "JE 2", 487, 730));
    vaccScheduleItems.push(C.addChecklistItem(dateOfBirth, "Vitamin A 2", 487, 730));
    vaccScheduleItems.push(C.addChecklistItem(dateOfBirth, "OPV Booster", 487, 730));
    vaccScheduleItems.push(C.addChecklistItem(dateOfBirth, "DPT Booster", 487, 730));
    //Additional Vitamin A doses
    vaccScheduleItems.push(C.addChecklistItem(dateOfBirth, "Vitamin A 3", 730, 730));
    vaccScheduleItems.push(C.addChecklistItem(dateOfBirth, "Vitamin A 4", 913, 913));
    vaccScheduleItems.push(C.addChecklistItem(dateOfBirth, "Vitamin A 5", 1095, 1095));
    vaccScheduleItems.push(C.addChecklistItem(dateOfBirth, "Vitamin A 6", 1278, 1278));
    vaccScheduleItems.push(C.addChecklistItem(dateOfBirth, "Vitamin A 7", 1460, 1460));
    vaccScheduleItems.push(C.addChecklistItem(dateOfBirth, "Vitamin A 8", 1643, 1643));
    vaccScheduleItems.push(C.addChecklistItem(dateOfBirth, "Vitamin A 9", 1825, 1825));

    return {name: 'Vaccination Schedule', items: vaccScheduleItems, baseDate: dateOfBirth};
};

export  {getVaccSchedule};