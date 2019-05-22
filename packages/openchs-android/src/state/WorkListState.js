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
        nextWorkItem.parameters = _.merge({}, parameters, nextWorkItem.parameters);
        this.workLists.currentWorkList.setCurrentWorkItem(nextWorkItem);
        return this.workLists.getCurrentWorkItem();
    }

    peekNextWorkItem() {
        return this.workLists.currentWorkList.nextWorkItem();
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