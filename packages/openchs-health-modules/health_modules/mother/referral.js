import ComplicationsBuilder from "../rules/complicationsBuilder";

const referralAdvice = (enrolment) => {
    const referralAdvice = new ComplicationsBuilder({
        programEnrolment: enrolment,
        complicationsConcept: 'Refer her to hospital for'
    });
    referralAdvice.addComplication("TB")
        .when.valueInEnrolment("Did she complete her TB treatment?").containsAnswerConceptName("No")
        .or.when.valueInEnrolment("Has she been taking her TB medication regularly?").containsAnswerConceptName("No");
    return referralAdvice.getComplications();
};

export default referralAdvice;