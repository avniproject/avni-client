import BaseService from "../BaseService";
import Service from "../../framework/bean/Service";
import {ReportCard, StandardReportCardType, ApprovalStatus} from "avni-models";
import EntityApprovalStatusService from "../EntityApprovalStatusService";
import RuleEvaluationService from "../RuleEvaluationService";
import IndividualService from "../IndividualService";
import CommentService from "../comment/CommentService";
import _ from "lodash";
import TaskService from "../task/TaskService";

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
        return {
            primaryValue: _.map(result, ({data}) => data.length).reduce((total, l) => total + l, 0),
            secondaryValue: null,
            clickable: true
        };
    }

    getResultForApprovalCardsType(type) {
        return this.getService(EntityApprovalStatusService).getAllEntitiesWithStatus(this._getApprovalStatusForType(type));
    }

    getCountForCommentCardType() {
        return {
            primaryValue: this.getResultForCommentCardType().length,
            secondaryValue: null,
            clickable: true
        };
    }

    getResultForCommentCardType() {
        return this.getService(CommentService).getAllOpenCommentThreads();
    }

    getCountForTaskCardType(taskTypeType) {
        return {
            primaryValue: this.getResultForTaskCardType(taskTypeType).length,
            secondaryValue: null,
            clickable: true
        };
    }

    getResultForTaskCardType(taskTypeType) {
        return this.getService(TaskService).getIncompleteTasks(taskTypeType);
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
        return {
            primaryValue: this.getResultForDefaultCardsType(type).result.length,
            secondaryValue: null,
            clickable: true
        };
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
            case standardReportCardType.isTaskType() :
                return this.getCountForTaskCardType(standardReportCardType.getTaskTypeType());
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
                return {status: null, result: this.getResultForCommentCardType()}
            }
            case standardReportCardType.isTaskType() : {
                return {status: standardReportCardType.getTaskTypeType(), result: this.getResultForTaskCardType(standardReportCardType.getTaskTypeType())}
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
