import General from "../../../src/utility/General";
import {Encounter} from 'openchs-models';

class TestEncounterFactory {
    static create({
                      uuid = General.randomUUID(),
                      encounterType,
                      encounterDateTime,
                      earliestVisitDateTime,
                      maxVisitDateTime,
                      subject: subject,
                      observations = [],
                      approvalStatuses = []
                  }) {
        const encounter = new Encounter();
        encounter.uuid = uuid;
        encounter.encounterType = encounterType;
        encounter.encounterDateTime = encounterDateTime;
        encounter.individual = subject;
        encounter.observations = observations;
        encounter.approvalStatuses = approvalStatuses;
        encounter.earliestVisitDateTime = earliestVisitDateTime;
        encounter.maxVisitDateTime = maxVisitDateTime;
        encounter.setLatestEntityApprovalStatus(encounter.latestEntityApprovalStatus);
        return encounter;
    }
}

export default TestEncounterFactory;
