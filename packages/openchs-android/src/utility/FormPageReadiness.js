import _ from "lodash";
import {ValidationResult} from "openchs-models";

// Repeatable photo/video groups (e.g. "Take Photos of all lesions") enforce a minimum row count
// via a rule evaluated only when Next is actually pressed, so it isn't part of
// FormElementGroup.validate()'s synchronous, rule-free checks. RepeatableFormElement.js already
// computes this same comparison client-side to show its "N/required" hint - this mirrors that
// exact logic so the same requirement can also feed the Next button's live-readiness colour,
// without invoking the async rule engine.
function isRepeatableMediaGroup(formElement, filteredFormElements) {
    if (!formElement.isRepeatableQuestionGroup() || formElement.recordValueByKey('disableManualActions')) {
        return false;
    }
    const childFormElements = _.filter(filteredFormElements, child => child.groupUuid === formElement.uuid);
    return _.some(childFormElements, child => _.includes(['Image', 'Video'], _.get(child, 'concept.datatype')));
}

function getRepeatableMediaGroupValidationResults(filteredFormElements, observationHolder) {
    const repeatableMediaGroups = _.filter(filteredFormElements, fe => isRepeatableMediaGroup(fe, filteredFormElements));
    return _.map(repeatableMediaGroups, formElement => {
        const minRequired = formElement.recordValueByKey('minNumberOfMedia') || 8;
        const observation = observationHolder.findObservation(formElement.concept);
        const capturedCount = _.isNil(observation) ? 0 : observation.getValueWrapper().nonEmptySize();
        return capturedCount >= minRequired
            ? ValidationResult.successful(formElement.uuid)
            : ValidationResult.failure(formElement.uuid, 'pleaseAddAtLeastNImages', {count: minRequired});
    });
}

// Same validation FormElementGroup.validate() runs on Next-press, plus the repeatable-media
// minimum-count check above - everything here is pure/synchronous (no reducer context, no rule
// engine, no state mutation), so it's safe to recompute on every render purely to drive the Next
// button's colour.
export function getCurrentPageValidationResults(formElementGroup, filteredFormElements, observationHolder) {
    return [
        ...formElementGroup.validate(observationHolder, filteredFormElements),
        ...getRepeatableMediaGroupValidationResults(filteredFormElements, observationHolder)
    ];
}
