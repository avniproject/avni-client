import ComplicationsBuilder from "../rules/complicationsBuilder";
import _ from "lodash";

const getDecisions = (programEncounter) => {
    return {enrolmentDecisions: [], encounterDecisions: [], registrationDecisions: []};
};

export {getDecisions};