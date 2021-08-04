import BaseService from "../BaseService";
import Service from "../../framework/bean/Service";
import {ReportCard, StandardReportCardType, ApprovalStatus} from "avni-models";
import EntityApprovalStatusService from "../EntityApprovalStatusService";
import RuleEvaluationService from "../RuleEvaluationService";
import IndividualService from "../IndividualService";
import CommentService from "../comment/CommentService";
import _ from "lodash";

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

    getCountForCommentCardType() {
        return this.getResultForCommentCardType().length;
    }

    getResultForCommentCardType() {
        return this.getService(CommentService).getAllOpenCommentThreads();
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
        const sortedResult = type === StandardReportCardType.type.Total ? result : _.orderBy(result, ({visitInfo}) => visitInfo.sortingBy, 'desc');
        return {status: type, result: sortedResult}
    }

    getCountForDefaultCardsType(type) {
        return this.getResultForDefaultCardsType(type).result.length;
    }

    getReportCardCount(reportCard) {
        const standardReportCardType = reportCard.standardReportCardType;
        switch (true) {
            case _.isNil(standardReportCardType) :
                return this.getService(RuleEvaluationService).getDashboardCardCount(reportCard.query);
            case standardReportCardType.isApprovalType() :
                return this.getCountForApprovalCardsType(standardReportCardType.name);
            case standardReportCardType.isDefaultType() :
                return this.getCountForDefaultCardsType(standardReportCardType.name);
            case standardReportCardType.isCommentType() :
                return this.getCountForCommentCardType();
        }
    }

    getReportCardResult(reportCard) {
        const standardReportCardType = reportCard.standardReportCardType;
        switch (true) {
            case _.isNil(standardReportCardType) : {
                const result = this.getService(RuleEvaluationService).getDashboardCardQueryResult(reportCard.query);
                return {status: null, result}
            }
            case standardReportCardType.isApprovalType() :
                return this.getResultForApprovalCardsType(standardReportCardType.name);
            case standardReportCardType.isDefaultType() :
                return this.getResultForDefaultCardsType(standardReportCardType.name);
            case standardReportCardType.isCommentType() : {
                const result = this.getResultForCommentCardType();
                return {status: null, result}
            }
        }
    }

    getStandardReportCardResultForEntity(reportCard, schemaAndQueryFilter) {
        const status = this._getApprovalStatusForType(reportCard.standardReportCardType.name);
        const {schema, filterQuery} = schemaAndQueryFilter;
        return this.getService(EntityApprovalStatusService).getAllEntitiesWithStatus(status, schema, filterQuery)
    }

}

export default ReportCardService
