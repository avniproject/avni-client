import {EnrolmentEligibilityCheck} from 'rules-config/rules';


@EnrolmentEligibilityCheck({
    name: 'MotherProgramEnrolmentEligibility',
    uuid: '4a557907-369e-4988-baf5-0898461adae2',
    programUUID: '076ddb2d-a499-4314-af95-4178553d279b',
    executionOrder: 100.0,
    metadata: {}
})
class MotherProgramEnrolmentEligibility {
    static exec({individual}) {
        return individual.isFemale() || individual.getAgeInYears() < 5;
    }
}