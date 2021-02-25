import BaseService from "../BaseService";
import Service from "../../framework/bean/Service";
import {ReportCard, StandardReportCardType, ApprovalStatus} from "avni-models";
import EntityApprovalStatusService from "../EntityApprovalStatusService";
import RuleEvaluationService from "../RuleEvaluationService";
import IndividualService from "../IndividualService";

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

    getCountForApprovalCardsType(type) {
        const {result} = this.getResultForApprovalCardsType(type);
        return _.map(result, ({data}) => data.length).reduce((total, l) => total + l, 0);
    }

    getResultForApprovalCardsType(type) {
        return this.getService(EntityApprovalStatusService).getAllEntitiesWithStatus(this._getApprovalStatusForType(type));
    }

    getResultForDefaultCardsType(type) {
        const individualService = this.getService(IndividualService);
        const typeToMethodMap = new Map([
            [StandardReportCardType.type.ScheduledVisits, individualService.allScheduledVisitsIn],
            [StandardReportCardType.type.OverdueVisits, individualService.allOverdueVisitsIn],
            [StandardReportCardType.type.LatestVisits, individualService.recentlyCompletedVisitsIn],
            [StandardReportCardType.type.LatestRegistrations, individualService.recentlyRegistered],
            [StandardReportCardType.type.LatestEnrolments, individualService.recentlyEnrolled],
            [StandardReportCardType.type.Total, individualService.allIn]
        ]);
        const resultFunc = typeToMethodMap.get(type);
        const result = type === StandardReportCardType.type.Total ? resultFunc() : resultFunc(new Date());
        return {status: type, result}
    }

    getCountForDefaultCardsType(type) {
        return this.getResultForDefaultCardsType(type).result.length;
    }

    getStandardReportCardCount(standardReportCardType) {
        const cardName = standardReportCardType.name;
        return standardReportCardType.isApprovalType() ? this.getCountForApprovalCardsType(cardName) : this.getCountForDefaultCardsType(cardName);
    }

    getStandardReportCardResult(standardReportCardType) {
        const cardName = standardReportCardType.name;
        return standardReportCardType.isApprovalType() ? this.getResultForApprovalCardsType(cardName) : this.getResultForDefaultCardsType(cardName);
    }

    getReportCardCount(reportCard) {
        const standardReportCardType = reportCard.standardReportCardType;
        if (!_.isNil(standardReportCardType)) {
            return this.getStandardReportCardCount(standardReportCardType);
        }
        return this.getService(RuleEvaluationService).getDashboardCardCount(reportCard.query);
    }

    getReportCardResult(reportCard) {
        const standardReportCardType = reportCard.standardReportCardType;
        if (!_.isNil(standardReportCardType)) {
            return this.getStandardReportCardResult(standardReportCardType);
        }
        const result = this.getService(RuleEvaluationService).getDashboardCardQueryResult(reportCard.query);
        return {status: null, result};
    }

    getStandardReportCardResultForEntity(reportCard, schemaAndQueryFilter) {
        const status = this._getApprovalStatusForType(reportCard.standardReportCardType.name);
        const {schema, filterQuery} = schemaAndQueryFilter;
        return this.getService(EntityApprovalStatusService).getAllEntitiesWithStatus(status, schema, filterQuery)
    }

}

export default ReportCardService
