import * as LoadAndForget from './formFilters/cancelFormFilters';
import {FormElementsStatusHelper} from "rules-config/rules";
import RoutineEncounterHandler from "./formFilters/RoutineEncounterHandler";
import DropoutEncounterFormHandler from "./formFilters/DropoutEncounterFormHandler";
import {encounterDecisions as vulnerabilityDecisionsFromEncounter} from './vulnerabilityDecisions';
import {encounterDecisions as counsellingEncounterDecisions} from './counsellingDecisions';
import {getNextScheduledVisits} from './adolescentVisitSchedule';
import {referralDecisions} from "./referralDecision";
import {RuleFactory} from 'rules-config/rules';

const RoutineVisitDecisions = RuleFactory("92cd5f05-eec3-4e70-9537-62119c5e3a16", "Decision");
const DropoutHomeVisit = RuleFactory("54636d6b-33bf-4faf-9397-eb3b1d9b1792", "Decision");
const DropoutFollowUpVisit = RuleFactory("0c444bf3-54c3-41e4-8ca9-f0deb8760831", "Decision");
const EleventhAndTwelfthVisit = RuleFactory("33583095-09be-408d-8e4b-fbcfee047aaa", "Decision");


const RoutineVisitViewFilters = RuleFactory("92cd5f05-eec3-4e70-9537-62119c5e3a16", "ViewFilter");
const DropoutHomeViewFilters = RuleFactory("54636d6b-33bf-4faf-9397-eb3b1d9b1792", "ViewFilter");
const DropoutFollowUpViewFilters = RuleFactory("0c444bf3-54c3-41e4-8ca9-f0deb8760831", "ViewFilter");
const EleventhAndTwelfthViewFilters = RuleFactory("33583095-09be-408d-8e4b-fbcfee047aaa", "ViewFilter");


@RoutineVisitViewFilters("36954eff-0eab-446a-a955-f2690c2aadeb", "All Routine Visit Filter", 1.0)
class RoutineFilter {
    static exec(programEncounter, formElementGroup) {
        return getFormElementsStatuses(programEncounter, formElementGroup);
    }
}

@DropoutHomeViewFilters("fa135fc8-4f85-43af-bcf1-39c954a70d8e", "All Dropout Home Visit Filter", 1.0)
class DHFilter {
    static exec(programEncounter, formElementGroup) {
        return getFormElementsStatuses(programEncounter, formElementGroup);
    }
}

@DropoutFollowUpViewFilters("bb6839e8-93a0-4444-8031-268ae410ed09", "All Dropout Followup Visit Filter", 1.0)
class DFFilter {
    static exec(programEncounter, formElementGroup) {
        return getFormElementsStatuses(programEncounter, formElementGroup);
    }
}

@EleventhAndTwelfthViewFilters("a24b9e68-a6bf-4b3e-9779-7a14f482b44c", "All 11th & 12th Std Visit Filter", 1.0)
class ElAndTwStdFilter {
    static exec(programEncounter, formElementGroup) {
        return getFormElementsStatuses(programEncounter, formElementGroup);
    }
}


@RoutineVisitDecisions("13a72ed7-d83a-4f7c-9f7a-58dad6f78986", "All Routine Visit Decisions", 1.0)
class RoutineVisit {
    static exec(programEncounter) {
        return getDecisions(programEncounter);
    }
}

@DropoutHomeVisit("a99466c8-f6fa-4cf7-bd31-45f4bd76d9d7", "All Dropout Home Visit Decisions", 1.0)
class DHVisit {
    static exec(programEncounter) {
        return getDecisions(programEncounter);
    }
}

@DropoutFollowUpVisit("a250245f-7e08-4275-aa47-5256ed268e03", "All Dropout Followup Visit Decisions", 1.0)
class DFVisit {
    static exec(programEncounter) {
        return getDecisions(programEncounter);
    }
}

@EleventhAndTwelfthVisit("9eb40e1b-2d99-4a18-bc2e-bd8530988039", "All 11th & 12th Std Visit Decisions", 1.0)
class ElAndTwStdVisit {
    static exec(programEncounter) {
        return getDecisions(programEncounter);
    }
}

const encounterTypeHandlerMap = new Map([
    ['Annual Visit', new RoutineEncounterHandler()],
    ['Quarterly Visit', new RoutineEncounterHandler()],
    ['Half-Yearly Visit', new RoutineEncounterHandler()],
    ['Monthly Visit', new RoutineEncounterHandler()],
    ['Dropout Home Visit', new DropoutEncounterFormHandler()]
]);


const getDecisions = (programEncounter) => {
    let vulnerabilityEncounterDecisions = vulnerabilityDecisionsFromEncounter(programEncounter.programEnrolment, programEncounter);
    let counsellingDecisions = counsellingEncounterDecisions(vulnerabilityEncounterDecisions, programEncounter);
    return referralDecisions(counsellingDecisions, programEncounter);
};

const getFormElementsStatuses = (programEncounter, formElementGroup) => {
    let handler = encounterTypeHandlerMap.get(programEncounter.encounterType.name);
    return FormElementsStatusHelper.getFormElementsStatuses(handler, programEncounter, formElementGroup);
};

export {getDecisions, getFormElementsStatuses, getNextScheduledVisits};
