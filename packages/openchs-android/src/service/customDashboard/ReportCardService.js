import BaseService from "../BaseService";
import Service from "../../framework/bean/Service";
import {ReportCard, StandardReportCardType, ApprovalStatus} from "avni-models";
import EntityApprovalStatusService from "../EntityApprovalStatusService";
import RuleEvaluationService from "../RuleEvaluationService";

@Service("reportCardService")
class ReportCardService extends BaseService {

    constructor(db, context) {
        super(db, context);
    }

    getSchema() {
        return ReportCard.schema.name;
    }

    _getApprovalStatusForType(type) {
        const typeToStatusMap = {
            [StandardReportCardType.type.PendingApproval]: ApprovalStatus.statuses.Pending,
            [StandardReportCardType.type.Approved]: ApprovalStatus.statuses.Approved,
            [StandardReportCardType.type.Rejected]: ApprovalStatus.statuses.Rejected,
        };
        return typeToStatusMap[type];
    }

    getCountForStandardCardType(type) {
        const {result} = this.getResultForStandardCardType(type);
        return _.map(result, ({data}) => data.length).reduce((total, l) => total + l, 0);
    }

    getResultForStandardCardType(type) {
        return this.getService(EntityApprovalStatusService).getAllEntitiesWithStatus(this._getApprovalStatusForType(type));
    }

    getReportCardCount(reportCard) {
        if (!_.isNil(reportCard.standardReportCardType)) {
            return this.getCountForStandardCardType(reportCard.standardReportCardType.name);
        }
        return this.getService(RuleEvaluationService).getDashboardCardCount(reportCard.query);
    }

    getReportCardResult(reportCard) {
        if (!_.isNil(reportCard.standardReportCardType)) {
            return this.getResultForStandardCardType(reportCard.standardReportCardType.name);
        }
        const result = this.getService(RuleEvaluationService).getDashboardCardQueryResult(reportCard.query);
        return {status: null, result};
    }

    getStandardReportCardResultForEntity(reportCard, entityType) {
        const status = this._getApprovalStatusForType(reportCard.standardReportCardType.name);
        return this.getService(EntityApprovalStatusService).getAllEntitiesWithStatus(status, entityType)
    }

}

export default ReportCardService
