import _ from "lodash";
import C from "../../common";
import {FormElementsStatusHelper, FormElementStatusBuilder, FormElementStatus} from "rules-config/rules";
import VaccinationFilters from "./VaccinationFilters";

//any gestaional age beyond 28 weeks is 3rd trimester
export const TRIMESTER_MAPPING = new Map([[1, {from: 0, to: 12}], [2, {from: 13, to: 28}], [3, {from: 29, to: Infinity}]]);

class ANCFormHandler {

    preFilter(programEncounter, formElement, today) {
        let lmp = programEncounter.programEnrolment.getObservationValue('Last menstrual period');
        let td = _.get(programEncounter, "encounterDateTime", new Date());
        this._gestationalAge = FormElementsStatusHelper.weeksBetween(td, lmp);
    }

    haveYouEnrolledInAnyGovernmentScheme(programEncounter, formElement) {
        let statusBuilder = this._formStatusBuilder(programEncounter, formElement);
        statusBuilder.show().when.valueInEntireEnrolment("Have you enrolled in any government scheme?").is.notDefined;
        return statusBuilder.build();
    }

    hasSheBeenDealingWithAnyComplications(programEncounter, formElement) {
        const inclusionMapping = new Map([["Morning Sickness", [1, 2]],
            ['Excessive vomiting and inability to consume anything orally in last 24 hours', [1,2]],
            ["Difficulty breathing", [2, 3]],
            ["Fever", []],
            ["Blurred vision", [2, 3]],
            ["Severe headache", [2, 3]],
            ["PV leaking", [2, 3]]]);
        const statusBuilder = this._formStatusBuilder(programEncounter, formElement);
        formElement.concept.getAnswers()
            .map((answer) => Object.assign({
                name: answer.concept.name,
                uuid: answer.concept.uuid
            }))
            .filter(answer => [...inclusionMapping.keys()].indexOf(answer.name) > -1)
            .map((answer) => {
                statusBuilder.skipAnswers(answer.name)
                    .whenItem(this._isInCurrentTrimester(inclusionMapping.get(answer.name)))
                    .is.not.truthy;
            });

        statusBuilder.show().whenItem(true).is.truthy;
        return statusBuilder.build();
    }

    otherComplications(programEncounter, formElement) {
        const statusBuilder = this._formStatusBuilder(programEncounter, formElement);
        statusBuilder.show().when.valueInEncounter("Pregnancy complications").containsAnswerConceptName("Other");
        return statusBuilder.build();
    }

    vdrl(programEncounter, formElement) {
        const statusBuilder = this._formStatusBuilder(programEncounter, formElement);
        statusBuilder.show().when.valueInEntireEnrolment("VDRL").is.notDefined
            .or.when.valueInEncounter("VDRL").is.defined;
        return statusBuilder.build();
    }

    hivAidsTest(programEncounter, formElement) {
        const statusBuilder = this._formStatusBuilder(programEncounter, formElement);
        statusBuilder.show().when.valueInEntireEnrolment("HIV/AIDS Test").is.notDefined
            .or.when.valueInEncounter("HIV/AIDS Test").is.defined;
        return statusBuilder.build();
    }

    hbsAg(programEncounter, formElement) {
        const statusBuilder = this._formStatusBuilder(programEncounter, formElement);
        statusBuilder.show().when.valueInEntireEnrolment("HbsAg").is.notDefined
            .or.when.valueInEncounter("HbsAg").is.defined;
        return statusBuilder.build();
    }

    sicklingTest(programEncounter, formElement) {
        const statusBuilder = this._formStatusBuilder(programEncounter, formElement);
        statusBuilder.show().when.valueInEntireEnrolment("Sickling Test").is.notDefined
            .or.when.valueInEncounter("Sickling Test").is.defined;
        return statusBuilder.build();
    }

    hbElectrophoresis(programEncounter, formElement) {
        const statusBuilder = this._formStatusBuilder(programEncounter, formElement);
        statusBuilder.show().when.valueInEntireEnrolment("Hb Electrophoresis").is.notDefined
            .or.when.valueInEncounter("Hb Electrophoresis").is.defined;
        return statusBuilder.build();
    }

    fundalHeight(programEncounter, formElement) {
        const statusBuilder = this._formStatusBuilder(programEncounter, formElement);
        statusBuilder.show().whenItem(this._gestationalAge).is.greaterThanOrEqualTo(12);
        return statusBuilder.build();
    }

    fundalHeightFromPubicSymphysis(programEncounter, formElement) {
        const statusBuilder = this._formStatusBuilder(programEncounter, formElement);
        statusBuilder.show().whenItem(this._gestationalAge).is.greaterThanOrEqualTo(24);
        return statusBuilder.build();
    }

    abdominalGirth(programEncounter, formElement) {
        const statusBuilder = this._formStatusBuilder(programEncounter, formElement);
        statusBuilder.show().whenItem(this._gestationalAge).greaterThan(30);
        return statusBuilder.build();
    }

    foetalMovements(programEncounter, formElement) {
        const primiStatus = this._formStatusBuilder(programEncounter, formElement);
        const nonPrimiStatus = this._formStatusBuilder(programEncounter, formElement);

        primiStatus.show().whenItem(this._gestationalAge).greaterThanOrEqualTo(22).and
            .when.valueInEnrolment("Gravida").is.equals(1);

        nonPrimiStatus.show().whenItem(this._gestationalAge).greaterThanOrEqualTo(18).and
            .when.valueInEnrolment("Gravida").is.greaterThan(1);
        return primiStatus.build().or(nonPrimiStatus.build());
    }

    foetalHeartSound(programEncounter, formElement) {
        const statusBuilder = this._formStatusBuilder(programEncounter, formElement);
        statusBuilder.show().whenItem(this._gestationalAge).greaterThanOrEqualTo(28);
        return statusBuilder.build();
    }

    foetalHeartRate(programEncounter, formElement) {
        const statusBuilder = this._formStatusBuilder(programEncounter, formElement);
        statusBuilder.show().whenItem(this._gestationalAge).greaterThanOrEqualTo(28);
        return statusBuilder.build();
    }


    usgScanningDate(programEncounter, formElement) {
        const statusBuilder = this._formStatusBuilder(programEncounter, formElement);
        statusBuilder.show()
            .when.valueInEncounter("US Scanning Done").containsAnswerConceptName("Yes");
        return statusBuilder.build();
    }

    usgDatingScanDone(programEncounter, formElement) {
        const statusBuilder = this._formStatusBuilder(programEncounter, formElement);
        statusBuilder.show().whenItem(this._gestationalAge).greaterThanOrEqualTo(7).and.lessThanOrEqualTo(28);
        return statusBuilder.build();
    }

    usgAnomalyScanDone(programEncounter, formElement) {
        const statusBuilder = this._formStatusBuilder(programEncounter, formElement);
        statusBuilder.show().whenItem(this.currentTrimester).equals(2);
        return statusBuilder.build();
    }

    dateOfUsgDatingScan(programEncounter, formElement) {
        const statusBuilder = this._formStatusBuilder(programEncounter, formElement);
        statusBuilder.show()
            .when.valueInEncounter("USG dating scan done?").containsAnswerConceptName("Yes");
        return statusBuilder.build();
    }

    dateOfUsgAnomalyScan(programEncounter, formElement) {
        const statusBuilder = this._formStatusBuilder(programEncounter, formElement);
        statusBuilder.show()
            .when.valueInEncounter("USG anomaly scan done?").containsAnswerConceptName("Yes");
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
        const statusBuilder = this._formStatusBuilder(programEncounter, formElement);
        statusBuilder.show()
            .when.valueInEncounter("US Scanning Done").containsAnswerConceptName("Yes")
            .and.whenItem(this.currentTrimester).equals(3);
        return statusBuilder.build();
    }

    estimatedDateOfDeliveryByDoctor(programEncounter, formElement) {
        const statusBuilder = this._formStatusBuilder(programEncounter, formElement);
        statusBuilder.show()
            .when.valueInEncounter("US Scanning Done").containsAnswerConceptName("Yes");
        return statusBuilder.build();

    }

    tt1Date(programEncounter, formElement) {
        return VaccinationFilters.tt1Date(programEncounter, formElement);
    }
    tt2Date(programEncounter, formElement) {
        return VaccinationFilters.tt2Date(programEncounter, formElement);
    }
    ttBoosterDate(programEncounter, formElement) {
        return VaccinationFilters.ttBoosterDate(programEncounter, formElement);
    }

    bmi(programEncounter, formElement, today) {
        const status = new FormElementStatus(formElement.uuid, true);
        let height = programEncounter.findLatestObservationInEntireEnrolment("Height", programEncounter);
        let weight = programEncounter.findObservation("Weight");
        height = height && height.getValue();
        weight = weight && weight.getValue();
        if (_.isFinite(weight) && _.isFinite(height)) {
            status.value = C.calculateBMI(weight, height);
        }
        return status;
    }

    _existsInCurrentEncounter(programEncounter, formElement, conceptName) {
        const visibility = !_.isNil(programEncounter.findObservation(conceptName));
        return new FormElementStatus(formElement.uuid, visibility);
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
                this._gestationalAge <= TRIMESTER_MAPPING.get(trimester).to &&
                this._gestationalAge >= TRIMESTER_MAPPING.get(trimester).from);
    }

    _isInCurrentTrimester(trimesters) {
        return trimesters.indexOf(this.currentTrimester) > -1;
    }
}

export default ANCFormHandler;