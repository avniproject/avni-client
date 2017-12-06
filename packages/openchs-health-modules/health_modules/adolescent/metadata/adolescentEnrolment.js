import FormElement from "../../../../openchs-models/src/application/FormElement";

@Form("Adolescent Enrolment")
class AdolescentEnrolmentForm {
    @FormElement("")
    ifParentsAlive(individual, enrolment) {
        return enrolment.findObs("Parents life status?").containsAnyAnswerConceptName("Both Alive");
    }

    @FormElement("BMI")
    calculateBMI(individual, enrolment) {
        let height = enrolment.findObs("Height");
        let weight = enrolment.findObs("Weight");
        return {"value": (weight) / (height * height)};
    }

    @FormAnswers("Parents marital status?")
    parentsSeparated(individual, enrolment, answers) {
        return answers.filter((answer) => true);
    }
}