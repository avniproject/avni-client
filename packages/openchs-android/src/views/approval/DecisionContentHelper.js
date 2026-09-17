import _ from "lodash";

/**
 * Decides what an approval decision shows as its reason (avniproject/avni-client#2093).
 *
 * Kept as a helper rather than inline in the components because three things depend on it -
 * DecisionMessage, which is rendered from eleven views, and ApprovalDetailsCard - and they must agree.
 * It is also the only part of this change with logic worth testing; the components around it are markup.
 *
 * The decision is made per row and reads only that row. It deliberately never consults whether a form is
 * attached right now: an organisation that attaches a rejection form in March still holds February's
 * rejections as typed text, and those must render as text forever rather than becoming blank panels the
 * day the configuration changes.
 */
class DecisionContentHelper {

    /**
     * A rejection always shows its reason - typed or answered - because that is what the field worker has
     * to act on, and one has always been shown.
     *
     * An approval shows something only when the approver actually answered an Approval form. Approvals
     * carried nothing to show until organisations could attach one, and an approval with no answers must
     * stay silent rather than open an empty panel on every approved record in the app.
     */
    static shouldRender(entityApprovalStatus) {
        if (_.get(entityApprovalStatus, 'approvalStatus.isRejected')) return true;
        if (_.get(entityApprovalStatus, 'approvalStatus.isApproved')) return DecisionContentHelper.hasAnswers(entityApprovalStatus);
        return false;
    }

    /**
     * An empty answer list is not "has answers". Treating it as such would render an empty panel where
     * the typed reason belongs - worse than the previous behaviour, and silent.
     */
    static hasAnswers(entityApprovalStatus) {
        return !_.isEmpty(_.get(entityApprovalStatus, 'observations'));
    }

    static isApproval(entityApprovalStatus) {
        return !!_.get(entityApprovalStatus, 'approvalStatus.isApproved');
    }

    /**
     * The heading over the answers. An approver's answers on an approval are not a rejection note, and
     * labelling them as one is the kind of wrong word a field worker acts on.
     */
    static headerKey(entityApprovalStatus) {
        return DecisionContentHelper.isApproval(entityApprovalStatus) ? 'approvalNote' : 'rejectionNote';
    }
}

export default DecisionContentHelper;
