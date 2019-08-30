import {WorkLists, WorkList, WorkItem} from 'openchs-models';

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

    labelOrDefault(workItem, defaultLabel, i18n) {
        const parameterLabel = _.get(workItem, 'parameters.saveAndProceedLabel');
        const label = _.isEmpty(parameterLabel) ? defaultLabel : parameterLabel;
        return `${i18n.t('saveAnd')} ${i18n.t(label, {
            subject: workItem.parameters.subjectTypeName,
            program: workItem.parameters.programName,
            enc: workItem.parameters.encounterType
        })}`;
    }

    saveAndProceedButtonLabel(i18n) {
        const nextWorkItem = this.peekNextWorkItem();
        switch (nextWorkItem.type) {
            case WorkItem.type.REGISTRATION: {
                return this.labelOrDefault(nextWorkItem, 'anotherRegistration', i18n);
            }
            case WorkItem.type.PROGRAM_ENROLMENT: {
                return this.labelOrDefault(nextWorkItem, 'enrolIntoProgram', i18n);
            }
            case WorkItem.type.PROGRAM_ENCOUNTER: {
                return this.labelOrDefault(nextWorkItem, 'proceedEncounter', i18n);
            }
            case WorkItem.type.ENCOUNTER: {
                return this.labelOrDefault(nextWorkItem, 'proceedEncounter', i18n);
            }
        }
    }
}