import _ from 'lodash';
import {ValidationResult, Concept} from 'avni-models';

class GroupAffiliationState {
    constructor(groupSubjectObservations = []) {
        this.groupSubjectObservations = groupSubjectObservations;
    }

    updateGroupSubjectObservations(concept, groupSubject) {
        const newState = this.cloneForEdit();
        this.removeOrVoidOlderMemberForConcept(concept, newState);
        if (!groupSubject.memberSubject) {
            newState.groupSubjectObservations.push({concept, groupSubject});
        }
        return newState.groupSubjectObservations;
    }

    removeOrVoidOlderMemberForConcept(concept, newState) {
        const updatedObs = [];
        _.forEach(newState.groupSubjectObservations, obs => {
            if (obs.concept.uuid !== concept.uuid) {
                updatedObs.push(obs);
            } else if (obs.groupSubject.memberSubject) {
                const newGroupSubject = obs.groupSubject.cloneForEdit();
                newGroupSubject.voided = true;
                obs.groupSubject = newGroupSubject;
                updatedObs.push(obs);
            }
        });
        newState.groupSubjectObservations = updatedObs;
    }

    validate(formElements = []) {
        const validationResults = [];
        const GAFormElements = formElements.filter(fe => fe.concept.datatype === Concept.dataType.GroupAffiliation);
        _.forEach(GAFormElements, fe => {
            const obs = _.find(this.groupSubjectObservations, ({concept}) => concept.uuid === fe.concept.uuid);
            if (fe.mandatory && _.isEmpty(obs)) {
                validationResults.push(new ValidationResult(false, fe.uuid, "emptyValidationMessage"));
            } else {
                validationResults.push(new ValidationResult(true, fe.uuid))
            }
        });
        return validationResults;
    }

    cloneForEdit() {
        return new GroupAffiliationState(this.groupSubjectObservations);
    }

}

export default GroupAffiliationState;
