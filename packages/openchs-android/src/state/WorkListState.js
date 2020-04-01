import {WorkItem, WorkList, WorkLists} from 'avni-models';
import _ from "lodash";

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
            subject: i18n.t(_.defaultTo(workItem.parameters.subjectTypeName, "")),
            program: i18n.t(_.defaultTo(workItem.parameters.programName, "")),
            enc: i18n.t(_.defaultTo(workItem.parameters.encounterType, ""))
        })}`;
    }

    saveAndProceedButtonLabel(i18n) {
        const nextWorkItem = this.peekNextWorkItem();
        const tkey = new Map([
            [WorkItem.type.REGISTRATION, 'anotherRegistration'],
            [WorkItem.type.PROGRAM_ENROLMENT, 'enrolIntoProgram'],
            [WorkItem.type.PROGRAM_ENCOUNTER, 'proceedEncounter'],
            [WorkItem.type.ENCOUNTER, 'proceedEncounter'],
            [WorkItem.type.ADD_MEMBER, 'addAnotherMember'],
        ]).get(nextWorkItem.type);
        return this.labelOrDefault(nextWorkItem, tkey, i18n);
    }
}
