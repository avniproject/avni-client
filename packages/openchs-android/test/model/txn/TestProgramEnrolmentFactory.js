import General from "../../../src/utility/General";
import {ProgramEnrolment} from 'openchs-models';
import moment from "moment/moment";

class TestProgramEnrolmentFactory {
  static create({
                  uuid = General.randomUUID(),
                  program,
                  subject,
                  enrolmentDateTime = moment().toDate(),
                  encounters = [],
                  checklists = [],
                  observations = [],
                  approvalStatuses = []
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
    programEnrolment.setLatestEntityApprovalStatus(programEnrolment.latestEntityApprovalStatus);
    return programEnrolment;
  }
}

export default TestProgramEnrolmentFactory;
