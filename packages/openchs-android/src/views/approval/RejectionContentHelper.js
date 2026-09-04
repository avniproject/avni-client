import _ from "lodash";

/**
 * Decides what a rejection shows as its reason (avniproject/avni-client#2093).
 *
 * Kept as a helper rather than inline in the components because three things depend on it -
 * RejectionMessage, which is rendered from eleven views, and ApprovalDetailsCard - and they must agree.
 * It is also the only part of this change with logic worth testing; the components around it are markup.
 *
 * The decision is made per row and reads only that row. It deliberately never consults whether a form is
 * attached right now: an organisation that attaches a rejection form in March still holds February's
 * rejections as typed text, and those must render as text forever rather than becoming blank panels the
 * day the configuration changes.
 */
class RejectionContentHelper {

    /**
     * Only rejections show a reason. Approvals show nothing, including once an organisation attaches an
     * approval form and approval decisions start carrying answers of their own.
     */
    static shouldRender(entityApprovalStatus) {
        return !!_.get(entityApprovalStatus, 'approvalStatus.isRejected');
    }

    /**
     * An empty answer list is not "has answers". Treating it as such would render an empty panel where
     * the typed reason belongs - worse than the previous behaviour, and silent.
     */
    static hasAnswers(entityApprovalStatus) {
        return !_.isEmpty(_.get(entityApprovalStatus, 'observations'));
    }
}

export default RejectionContentHelper;
