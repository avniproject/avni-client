import {FormElementsStatusHelper, FormElementStatusBuilder, FormElementStatus} from "rules-config/rules";
import { TRIMESTER_MAPPING } from "./ANCFormHandler";
import _ from "lodash";

class ANCLabTestResultsFormHandler {

    preFilter(programEncounter) {
        let lmp = programEncounter.programEnrolment.getObservationValue('Last menstrual period');
        let td = _.get(programEncounter, "encounterDateTime", new Date());
        this._gestationalAge = FormElementsStatusHelper.weeksBetween(td, lmp);
    }

    vdrl(programEncounter, formElement) {
        const statusBuilder = new FormElementStatusBuilder({programEncounter, formElement});
        statusBuilder.show().when.valueInEntireEnrolment("VDRL").is.notDefined
            .or.when.valueInEncounter("VDRL").is.defined;
        return statusBuilder.build();
    }

    hivAidsTest(programEncounter, formElement) {
        const statusBuilder = new FormElementStatusBuilder({programEncounter, formElement});
        statusBuilder.show().when.valueInEntireEnrolment("HIV/AIDS Test").is.notDefined
            .or.when.valueInEncounter("HIV/AIDS Test").is.defined;
        return statusBuilder.build();
    }

    hbsAg(programEncounter, formElement) {
        const statusBuilder = new FormElementStatusBuilder({programEncounter, formElement});
        statusBuilder.show().when.valueInEntireEnrolment("HbsAg").is.notDefined
            .or.when.valueInEncounter("HbsAg").is.defined;
        return statusBuilder.build();
    }

    sicklingTest(programEncounter, formElement) {
        const statusBuilder = new FormElementStatusBuilder({programEncounter, formElement});
        statusBuilder.show().when.valueInEntireEnrolment("Sickling Test").is.notDefined
            .or.when.valueInEncounter("Sickling Test").is.defined;
        return statusBuilder.build();
    }

    hbElectrophoresis(programEncounter, formElement) {
        const statusBuilder = new FormElementStatusBuilder({programEncounter, formElement});
        statusBuilder.show().when.valueInEntireEnrolment("Hb Electrophoresis").is.notDefined
            .or.when.valueInEncounter("Hb Electrophoresis").is.defined;
        return statusBuilder.build();
    }

    urinePregnancyTest(programEncounter, formElement) {
        const statusBuilder = new FormElementStatusBuilder({programEncounter, formElement});
        statusBuilder.show().whenItem(this.currentTrimester).equals(1);
        return statusBuilder.build();
    }

    foetalPresentation(programEncounter, formElement) {
        const statusBuilder = new FormElementStatusBuilder({programEncounter, formElement});
        statusBuilder.show().whenItem(this.currentTrimester).equals(3);
        return statusBuilder.build();
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
}

export default ANCLabTestResultsFormHandler;