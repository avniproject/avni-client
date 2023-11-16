import {ApprovalStatus} from 'openchs-models';
import General from "../../../src/utility/General";

class TestApprovalStatusFactory {
    static create({uuid = General.randomUUID(), status = ApprovalStatus.statuses.Approved}) {
        const approvalStatus = new ApprovalStatus();
        approvalStatus.uuid = uuid;
        approvalStatus.status = status;
        return approvalStatus;
    }
}

export default TestApprovalStatusFactory;
