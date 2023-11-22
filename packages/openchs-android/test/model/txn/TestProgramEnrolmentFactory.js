import General from "../../src/utility/General";
import {ProgramEnrolment} from 'openchs-models';

class TestProgramEnrolmentFactory {
  static create({
                  uuid = General.randomUUID(),
                  name,
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
    programEnrolment.name = name;
    programEnrolment.program = program;
    programEnrolment.individual = subject;
    programEnrolment.displayName = name;
    programEnrolment.operationalProgramName = name;
    programEnrolment.encounters = encounters;
    programEnrolment.checklists = checklists;
    programEnrolment.observations = observations;
    programEnrolment.enrolmentDateTime = enrolmentDateTime;
    programEnrolment.approvalStatuses = approvalStatuses;
    programEnrolment.setLatestEntityApprovalStatus(programEnrolment.latestEntityApprovalStatus);

    return programEnrolment;
  }
}

export default TestProgramEnrolmentFactory;
