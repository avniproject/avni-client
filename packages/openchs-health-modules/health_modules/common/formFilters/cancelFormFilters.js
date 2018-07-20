import { FormElementsStatusHelper, RuleFactory, FormElementStatus } from 'rules-config/rules';
import _ from 'lodash';
const filters = RuleFactory("aac5c57a-aa01-49bb-ad20-70536dd2907f", "ViewFilter");

@filters("538c2ee6-1510-4835-9e66-e09e9f6c92cd", "CancellationFormFilters", 120.0, {})
class CancellationFormFilters {

    otherReason(programEncounter, formElement) {
        const cancelReasonObs = programEncounter.findCancelEncounterObservation('Visit cancel reason');
        const answer = cancelReasonObs && cancelReasonObs.getReadableValue();
        return new FormElementStatus(formElement.uuid, answer === 'Other');
    }

    static exec(programEncounter, formElementGroup, today) {
        return FormElementsStatusHelper.getFormElementsStatusesWithoutDefaults(new CancellationFormFilters(), programEncounter, formElementGroup, today);
    }
}
