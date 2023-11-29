import General from "../../../src/utility/General";
import {ProgramEnrolment} from 'openchs-models';

class TestProgramEnrolmentFactory {
  static create({
                  uuid = General.randomUUID(),
                  program,
                  subject,
                  enrolmentDateTime,
                  encounters = [],
                  checklists = [],
                  observations = [],
                  approvalStatuses = [],
                  latestEntityApprovalStatus
                }) {
    const programEnrolment = new ProgramEnrolment();
    programEnrolment.uuid = uuid;
    programEnrolment.program = program;
    programEnrolment.individual = subject;
    programEnrolment.encounters = encounters;
    programEnrolment.checklists = checklists;
    programEnrolment.observations = observations;
    programEnrolment.enrolmentDateTime = enrolmentDateTime;
    programEnrolment.approvalStatuses = approvalStatuses;
    programEnrolment.setLatestEntityApprovalStatus(latestEntityApprovalStatus);

    return programEnrolment;
  }
}

export default TestProgramEnrolmentFactory;
