import _ from "lodash";

// A group answer carries a copy of its concept from when it was saved, so the current one is looked up.
const isHiddenAnswer = (observation, conceptService) =>
    (conceptService.getConceptByUUID(observation.concept.uuid) || observation.concept).isHidden();

export const visibleGroupObservations = (groupObservations, conceptService) =>
    _.reject(groupObservations, (observation) => isHiddenAnswer(observation, conceptService));

const groupAnswers = (observation) => {
    const valueWrapper = observation.getValueWrapper();
    if (_.isNil(valueWrapper)) return [];
    const questionGroups = valueWrapper.isRepeatable() ? valueWrapper.getValue() : [valueWrapper];
    return _.flatMap(questionGroups, (questionGroup) => questionGroup.getValue());
};

const hidesEveryAnswer = (observation, conceptService) => {
    const answers = groupAnswers(observation);
    return !_.isEmpty(answers) && _.isEmpty(visibleGroupObservations(answers, conceptService));
};

export const visibleObservations = (observations, conceptService) =>
    _.reject(observations, (observation) => observation.concept.isHidden()
        || (observation.concept.isQuestionGroup() && hidesEveryAnswer(observation, conceptService)));
