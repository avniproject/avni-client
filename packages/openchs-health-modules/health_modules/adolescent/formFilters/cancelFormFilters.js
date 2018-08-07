import {FormElementsStatusHelper, FormElementStatusBuilder} from 'rules-config/rules';
import {RuleFactory} from "rules-config";

const filters = RuleFactory("c294aadf-94a6-4908-8d04-9cc4ce2b901c", "ViewFilter");

@filters("43d12602-5fe2-49fd-949d-1db2057b0bd0", "CancellationFormFilters", 120.0, {})
class CancellationFormFilters {

    reasonForCancellationOfVisitUnspecifiedAbove(programEncounter, formElement) {
        let statusBuilder = new FormElementStatusBuilder({programEncounter, formElement});
        statusBuilder.show().when.valueInCancelEncounter("Reason for cancellation of visit").containsAnswerConceptName('Other');
        return statusBuilder.build();
    }

    static exec(programEncounter, formElementGroup, today) {
        return FormElementsStatusHelper.getFormElementsStatusesWithoutDefaults(new CancellationFormFilters(), programEncounter, formElementGroup, today);
    }
}
