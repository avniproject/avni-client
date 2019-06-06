import { WorkLists, WorkList, WorkItem } from 'openchs-models';

export default class WorkListState {
    constructor(workLists: WorkLists, getParametersFn) {
        this.workLists = workLists;
        this.workLists && this.workLists.setFirstWorkListAsCurrent();
        this.getParametersFn = getParametersFn;
    }

    setCurrentWorkListByName(name) {
        this.workLists.setCurrentWorkListByName(name);
    }

    moveToNextWorkItem() {
        const parameters = this.getParametersFn();
        let nextWorkItem = this.workLists.currentWorkList.nextWorkItem();
        let currentWorkItem = this.currentWorkItem;
        //Assign any new parameters that may have been created during this flow. This will serve as a record of what was created.
        currentWorkItem.parameters = _.merge({}, parameters, currentWorkItem.parameters);

        //Assign context to the next parameters if it may be useful during the flow
        nextWorkItem.parameters = _.merge({}, parameters, nextWorkItem.parameters);
        this.workLists.currentWorkList.setCurrentWorkItem(nextWorkItem);
        return this.workLists.getCurrentWorkItem();
    }

    peekNextWorkItem() {
        return this.workLists.peekNextWorkItem();
    }

    get currentWorkList() {
        return this.workLists.currentWorkList;
    }

    get currentWorkItem() {
        return this.workLists.getCurrentWorkItem();
    }

    saveAndProceedButtonLabel(i18n) {
        const nextWorkItem = this.peekNextWorkItem();
        switch (nextWorkItem.type) {
            case WorkItem.type.REGISTRATION: {
                return i18n.t('saveAndAnotherRegistration', {subject: nextWorkItem.parameters.subjectTypeName});
            }
            case WorkItem.type.PROGRAM_ENROLMENT: {
                return i18n.t('saveAndEnrol', {program: nextWorkItem.parameters.programName});
            }
            case WorkItem.type.PROGRAM_ENCOUNTER: {
                return i18n.t('saveAndProceedEncounter', {enc: nextWorkItem.parameters.encounterType});
            }
        }
    }
}