import _ from "lodash";
import FormElementsStatusHelper from "../../rules/FormElementsStatusHelper";
import {FormElementStatus} from "openchs-models";
import FormElementStatusBuilder from "../../rules/FormElementStatusBuilder";

const TRIMESTER_MAPPING = new Map([[1, {from: 0, to: 12}], [2, {from: 13, to: 28}], [3, {from: 29, to: 40}]]);

class ANCFormHandler {

    preFilter(programEncounter, formElement, today) {
        let lmp = programEncounter.programEnrolment.getObservationValue('Last menstrual period');
        this.gestationalAge = FormElementsStatusHelper.weeksBetween(today, lmp);
    }

    estimatedDateOfDelivery(programEncounter, formElement) {
        const edd = programEncounter.programEnrolment.getObservationValue("Estimated Date of Delivery");
        return new FormElementStatus(formElement.uuid, true, edd);
    }

    hasSheBeenDealingWithAnyComplications(programEncounter, formElement) {
        const inclusionMapping = new Map([["Morning Sickness", [1, 2]],
            ["Difficulty breathing", [2, 3]],
            ["Blurring of vision", [2, 3]],
            ["Decreased Foetal movements", [3]],
            ["Severe headache", [2, 3]],
            ["PV leaking", [2, 3]]]);
        const statusBuilder = this._formStatusBuilder(programEncounter, formElement);
        formElement.concept.answers
            .map((answer) => Object.assign({
                name: answer.concept.name,
                uuid: answer.concept.uuid
            }))
            .filter(answer => [...inclusionMapping.keys()].indexOf(answer.name) > -1)
            .filter((answer) => {
                statusBuilder.skipAnswers(answer.name)
                    .whenItem(this._isInCurrentTrimester(inclusionMapping.get(answer.name)))
                    .is.not.truthy;
            });

        return statusBuilder.build();
    }

    otherComplications(programEncounter, formElement) {
        const statusBuilder = this._formStatusBuilder(programEncounter, formElement);
        statusBuilder.show().when.valueInEncounter("Pregnancy complications").containsAnswerConceptName("Other");
        return statusBuilder.build();
    }

    fundalHeightFromPubicSymphysis(programEncounter, formElement) {
        const statusBuilder = this._formStatusBuilder(programEncounter, formElement);
        statusBuilder.show().whenItem(this.currentTrimester).equals(3);
        return statusBuilder.build();
    }

    abdominalGirth(programEncounter, formElement) {
        const statusBuilder = this._formStatusBuilder(programEncounter, formElement);
        statusBuilder.show().whenItem(this.gestationalAge).greaterThanOrEqualTo(24);
        return statusBuilder.build();
    }

    foetalMovements(programEncounter, formElement) {
        const statusBuilder = this._formStatusBuilder(programEncounter, formElement);
        statusBuilder.show().whenItem(this.currentTrimester).equalsOneOf(2, 3);
        return statusBuilder.build();
    }

    foetalHeartSound(programEncounter, formElement) {
        const statusBuilder = this._formStatusBuilder(programEncounter, formElement);
        statusBuilder.show().whenItem(this.gestationalAge).greaterThanOrEqualTo(28);
        return statusBuilder.build();
    }

    foetalHeartRate(programEncounter, formElement) {
        const statusBuilder = this._formStatusBuilder(programEncounter, formElement);
        statusBuilder.show().whenItem(this.gestationalAge).greaterThanOrEqualTo(28);
        return statusBuilder.build();
    }


    usgScanningDate(programEncounter, formElement) {
        const statusBuilder = this._formStatusBuilder(programEncounter, formElement);
        statusBuilder.show()
            .when.valueInEncounter("US Scanning Done").containsAnswerConceptName("Yes");
        return statusBuilder.build();
    }

    numberOfFoetus(programEncounter, formElement) {
        return this.usgScanningDate(programEncounter, formElement);
    }

    liquour(programEncounter, formElement) {
        return this.usgScanningDate(programEncounter, formElement);
    }

    placentaPrevia(programEncounter, formElement) {
        return this.usgScanningDate(programEncounter, formElement);
    }

    foetalPresentation(programEncounter, formElement) {
        return this._formStatusBuilder(programEncounter, formElement).show()
            .when.valueInEncounter("US Scanning Done").containsAnswerConceptName("Yes")
            .and.whenItem(this.currentTrimester).equals(3);
    }

    tt1Date(programEncounter, formElement) {
        return this.validOnceAfter(programEncounter, formElement, 'TT1 Date', 13);
    }

    ttBoosterDate(programEncounter, formElement) {
        return this.validOnceAfter(programEncounter, formElement, 'TT Booster Date', 13);
    }

    tt2Date(programEncounter, formElement) {
        return this.validOnceAfter(programEncounter, formElement, 'TT2 Date', 21);
    }

    validOnceAfter(programEncounter, formElement, conceptName, weeks) {
        let visibility = this.gestationalAge > weeks && _.isNil(programEncounter.findObservationInEntireEnrolment(conceptName));
        return new FormElementStatus(formElement.uuid, visibility);
    }

    urinePregnancyTest(programEncounter, formElement) {
        let statusBuilder = this._formStatusBuilder(programEncounter, formElement);
        statusBuilder.show().when.valueInEntireEnrolment("Urine pregnancy test").is.notDefined;
        return statusBuilder.build();
    }

    _formStatusBuilder(programEncounter, formElement) {
        return new FormElementStatusBuilder({
            programEncounter: programEncounter,
            formElement: formElement
        })
    }

    _getTrimesterSpec(trimesters) {
        return {
            from: TRIMESTER_MAPPING.get(_.min(trimesters.sort())).from,
            to: TRIMESTER_MAPPING.get(_.max(trimesters.sort())).to
        };
    }

    get currentTrimester() {
        return [...TRIMESTER_MAPPING.keys()]
            .find((trimester) =>
                this.gestationalAge <= TRIMESTER_MAPPING.get(trimester).to &&
                this.gestationalAge >= TRIMESTER_MAPPING.get(trimester).from);
    }

    _isInCurrentTrimester(trimesters) {
        return trimesters.indexOf(this.currentTrimester) > -1;
    }
}

export default ANCFormHandler;