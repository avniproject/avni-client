import EntityApprovalStatusService from "../../service/EntityApprovalStatusService";
import PrivilegeService from "../../service/PrivilegeService";
import FormMappingService from "../../service/FormMappingService";
import _ from "lodash";

/**
 * Opens the mapped Approval or Rejection form if the organisation has attached one, and reports whether it
 * did (avniproject/avni-client#2091).
 *
 * Navigation is done through a callback supplied in the action payload rather than by importing a
 * navigator here, because these are reducers. onApprove and onReject already take a `cb` and invoke it, so
 * this follows the idiom the file already uses.
 *
 * Returns false - meaning "fall through to the comment box" - whenever there is no form, no callback, or
 * anything unexpected. That fallback is every organisation on day one, and also any device that has not
 * finished syncing form metadata, so it has to be the safe default rather than an error path.
 */
function openMappedFormIfAny(action, context, findForm) {
    const {entity, navigateToForm} = action;
    if (_.isNil(navigateToForm) || _.isNil(entity)) return false;
    const form = findForm(context.get(FormMappingService), entity);
    if (_.isNil(form)) return false;
    navigateToForm(form);
    return true;
}

class ApprovalActions {

    static getInitialState() {
        return {rejectionComment: "", openDialog: false};
    }

    static onLoad(state, action, context) {
        const newState = {...state};
        const initialState = ApprovalActions.getInitialState();
        const privilegeService = context.get(PrivilegeService);
        const {entity, schema} = action;
        const showApprovalButtons = privilegeService.displayApprovalEntityButtons(entity, schema);
        const showEditButton = privilegeService.displayEditEntityButton(entity, schema);
        return {...newState, ...initialState, showApprovalButtons, showEditButton};
    }

    static onApprovePress(state, action, context) {
        const newState = {...state};
        const {entity, I18n} = action;
        newState.rejectionComment = "";
        if (openMappedFormIfAny(action, context, (service, e) => service.findApprovalFormFor(e))) {
            newState.openDialog = false;
            return newState;
        }
        newState.openDialog = true;
        newState.title = I18n.t('approveRequestTitle', {entityName: entity.getName()});
        newState.message = I18n.t('approveRequestMsg', {subjectName: entity.individual.nameString});
        newState.showInputBox = false;
        return newState;
    }

    static onDialogClose(state) {
        const newState = {...state};
        newState.openDialog = false;
        return newState;
    }

    static onInputChange(state, action) {
        const newState = {...state};
        newState.rejectionComment = action.value;
        return newState;
    }

    static onRejectPress(state, action, context) {
        const newState = {...state};
        const {entity, I18n} = action;
        newState.rejectionComment = "";
        if (openMappedFormIfAny(action, context, (service, e) => service.findRejectionFormFor(e))) {
            newState.openDialog = false;
            return newState;
        }
        newState.openDialog = true;
        newState.title = I18n.t('rejectRequestTitle', {
            entityName: entity.getName(),
            subjectName: entity.individual.nameString
        });
        newState.message = I18n.t('rejectRequestMsg');
        newState.showInputBox = true;
        return newState;
    }

    static onApprove(state, action, context) {
        const newState = {...state};
        const {entity, schema, cb} = action;
        newState.openDialog = false;
        context.get(EntityApprovalStatusService).approveEntity(entity, schema);
        cb();
        return newState;
    }

    static onReject(state, action, context) {
        const newState = {...state};
        const {entity, schema, cb} = action;
        newState.openDialog = false;
        context.get(EntityApprovalStatusService).rejectEntity(entity, schema, newState.rejectionComment);
        cb();
        return newState;
    }
}

const ActionPrefix = 'Approval';

const ApprovalActionNames = {
    ON_LOAD: `${ActionPrefix}.ON_LOAD`,
    ON_APPROVE: `${ActionPrefix}.ON_APPROVE`,
    ON_APPROVE_PRESS: `${ActionPrefix}.ON_APPROVE_PRESS`,
    ON_REJECT: `${ActionPrefix}.ON_REJECT`,
    ON_REJECT_PRESS: `${ActionPrefix}.ON_REJECT_PRESS`,
    ON_DIALOG_CLOSE: `${ActionPrefix}.ON_DIALOG_CLOSE`,
    ON_INPUT_CHANGE: `${ActionPrefix}.ON_INPUT_CHANGE`,
};

const ApprovalActionMap = new Map([
    [ApprovalActionNames.ON_LOAD, ApprovalActions.onLoad],
    [ApprovalActionNames.ON_APPROVE, ApprovalActions.onApprove],
    [ApprovalActionNames.ON_APPROVE_PRESS, ApprovalActions.onApprovePress],
    [ApprovalActionNames.ON_REJECT, ApprovalActions.onReject],
    [ApprovalActionNames.ON_REJECT_PRESS, ApprovalActions.onRejectPress],
    [ApprovalActionNames.ON_DIALOG_CLOSE, ApprovalActions.onDialogClose],
    [ApprovalActionNames.ON_INPUT_CHANGE, ApprovalActions.onInputChange],
]);

export {ApprovalActions, ApprovalActionNames, ApprovalActionMap}
