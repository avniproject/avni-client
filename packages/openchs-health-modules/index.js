import _ from 'lodash';
import * as encounterDecision from "./health_modules/outpatient/encounterDecision";
import * as individualRegistrationDecision from "./health_modules/individualRegistrationDecision";
import * as familyRegistrationDecision from "./health_modules/familyRegistrationDecision";
import * as programConfig from "./health_modules/programConfig";
import * as programEnrolmentDecision from "./health_modules/programEnrolmentDecision";
import * as programEncounterDecision from "./health_modules/programEncounterDecision";
import customMessages from "./health_modules/customMessages.json";
import * as rules from 'rules-config/rules';
import * as common from './health_modules/common.js';
import * as motherCalculations from './health_modules/mother/calculations';
import * as motherEligibilityCheckJustForEvaluation from './health_modules/mother/eligibilityCheck';

module.exports = _.merge({
    encounterDecision,
    individualRegistrationDecision,
    familyRegistrationDecision,
    programConfig,
    programEnrolmentDecision,
    programEncounterDecision,
    customMessages,
    common,
    motherCalculations,
}, rules);
