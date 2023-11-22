import General from "../../src/utility/General";
import {ProgramEncounter} from 'openchs-models';

class TestProgramEncounterFactory {
    static create({
                      uuid = General.randomUUID(),
                      name,
                      encounterType,
                      programEnrolment,
                      encounterDateTime,
                      earliestVisitDateTime,
                      maxVisitDateTime,
                      subject: subject,
                      observations = [],
                      approvalStatuses = []
                  }) {
        const programEncounter = new ProgramEncounter();
        programEncounter.uuid = uuid;
        programEncounter.name = name;
        programEncounter.displayName = name;
        programEncounter.encounterType = encounterType;
        programEncounter.programEnrolment = programEnrolment;
        programEncounter.encounterDateTime = encounterDateTime;
        programEncounter.individual = subject;
        programEncounter.observations = observations;
        programEncounter.approvalStatuses = approvalStatuses;
        programEncounter.earliestVisitDateTime = earliestVisitDateTime;
        programEncounter.maxVisitDateTime = maxVisitDateTime;
        programEncounter.setLatestEntityApprovalStatus(programEncounter.latestEntityApprovalStatus);
        return programEncounter;
    }
}

export default TestProgramEncounterFactory;
