import _ from "lodash";

export const RETURN_TO_SOURCE = 'returnToSource';

// True only when the work item being saved was opened from a card page, which asks to come back to it.
export const returnsToSource = (workLists) =>
    _.get(workLists && workLists.getCurrentWorkItem(), ['parameters', RETURN_TO_SOURCE]) === true;

// An organisation's work-list rule may replace the work lists when the last form page completes, before the summary screen. This puts the flag back.
export const keepReturnToSource = (workLists) => {
    const currentWorkItem = workLists && workLists.getCurrentWorkItem();
    if (_.isNil(currentWorkItem)) return;
    if (_.isNil(currentWorkItem.parameters)) currentWorkItem.parameters = {};
    currentWorkItem.parameters[RETURN_TO_SOURCE] = true;
};
