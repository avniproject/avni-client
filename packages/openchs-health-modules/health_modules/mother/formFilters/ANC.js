import _ from "lodash";
import FormFilterHelper from "../../rules/FormFilterHelper";
import {FormElementStatus} from "openchs-models";

class ANC {
    preFilter(programEncounter, formElement, today) {
        let lmp = programEncounter.programEnrolment.getObservationValue('Last Menstrual Period');
        this.weeksSinceLMP = FormFilterHelper.weeksBetween(today, lmp);
    }

    breastExaminationNipple(programEncounter, formElement) {
        let visibility = this.weeksSinceLMP <= 13 && _.isNil(programEncounter.findObservationInEntireEnrolment('Breast Examination - Nipple'));
        return new FormElementStatus(formElement.uuid, visibility);
    }

    fundalHeight(programEncounter, formElement) {
        return new FormElementStatus(formElement.uuid, this.weeksSinceLMP > 13);
    }

    foetalMovements(programEncounter, formElement) {
        return new FormElementStatus(formElement.uuid, this.weeksSinceLMP > 21);
    }

    foetalPresentation(programEncounter, formElement) {
        return new FormElementStatus(formElement.uuid, this.weeksSinceLMP > 29);
    }

    foetalHeartSound(programEncounter, formElement) {
        return new FormElementStatus(formElement.uuid, this.weeksSinceLMP > 29);
    }

    hb(programEncounter, formElement) {
        return new FormElementStatus(formElement.uuid, _.isNil(programEncounter.findObservationInEntireEnrolment('Hb')));
    }

    bloodSugar(programEncounter, formElement) {
        return new FormElementStatus(formElement.uuid, _.isNil(programEncounter.findObservationInEntireEnrolment('Blood Sugar')));
    }

    vrdl(programEncounter, formElement) {
        return new FormElementStatus(formElement.uuid, _.isNil(programEncounter.findObservationInEntireEnrolment('VRDL')));
    }

    hivaids(programEncounter, formElement) {
        return new FormElementStatus(formElement.uuid, _.isNil(programEncounter.findObservationInEntireEnrolment('HIV/AIDS')));
    }

    hbsAg(programEncounter, formElement) {
        return new FormElementStatus(formElement.uuid, _.isNil(programEncounter.findObservationInEntireEnrolment('HbsAg')));
    }

    bileSalts(programEncounter, formElement) {
        return new FormElementStatus(formElement.uuid, _.isNil(programEncounter.findObservationInEntireEnrolment('Bile Salts')));
    }

    bilePigments(programEncounter, formElement) {
        return new FormElementStatus(formElement.uuid, _.isNil(programEncounter.findObservationInEntireEnrolment('Bile Pigments')));
    }

    sicklingTest(programEncounter, formElement) {
        return new FormElementStatus(formElement.uuid, _.isNil(programEncounter.findObservationInEntireEnrolment('sicklingTest')));
    }

    hbElectrophoresis(programEncounter, formElement) {
        return new FormElementStatus(formElement.uuid, _.isNil(programEncounter.findObservationInEntireEnrolment('Hb Electrophoresis')));
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
        let visibility = this.weeksSinceLMP > weeks && _.isNil(programEncounter.findObservationInEntireEnrolment(conceptName));
        return new FormElementStatus(formElement.uuid, visibility);
    }
}

export default ANC;