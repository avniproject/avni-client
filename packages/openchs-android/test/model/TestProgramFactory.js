import {Program} from "openchs-models";
import General from "../../src/utility/General";

class TestProgramFactory {
  static create({
                  uuid = General.randomUUID(),
                  name,
                  colour = '#012345',
                  allowMultipleEnrolments = false,
                  manualEligibilityCheckRequired = false
                }) {
    const program = new Program();
    program.uuid = uuid;
    program.name = name;
    program.displayName = name;
    program.programSubjectLabel = name;
    program.operationalProgramName = name;
    program.colour = colour;
    program.allowMultipleEnrolments = allowMultipleEnrolments;
    program.manualEligibilityCheckRequired = manualEligibilityCheckRequired;
    program.showGrowthChart = false;
    return program;
  }
}

export default TestProgramFactory;
