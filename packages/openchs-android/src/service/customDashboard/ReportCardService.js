import BaseService from "../BaseService";
import Service from "../../framework/bean/Service";
import {ReportCard, StandardReportCardType, ApprovalStatus} from "avni-models";
import EntityApprovalStatusService from "../EntityApprovalStatusService";
import RuleEvaluationService from "../RuleEvaluationService";
import IndividualService from "../IndividualService";
import CommentService from "../comment/CommentService";
import _ from "lodash";
import TaskService from "../task/TaskService";
import General from "../../utility/General";
import {JSONStringify} from "../../utility/JsonStringify";

function getApprovalStatusForType(type) {
    const typeToStatusMap = {
        [StandardReportCardType.type.PendingApproval]: ApprovalStatus.statuses.Pending,
        [StandardReportCardType.type.Approved]: ApprovalStatus.statuses.Approved,
        [StandardReportCardType.type.Rejected]: ApprovalStatus.statuses.Rejected,
    };
    return typeToStatusMap[type];
}

@Service("reportCardService")
class ReportCardService extends BaseService {

    constructor(db, context) {
        super(db, context);
    }

    getSchema() {
        return ReportCard.schema.name;
    }

    getCountForApprovalCardsType(type, reportFilters) {
        const {result} = this.getResultForApprovalCardsType(type, reportFilters);
        return {
            primaryValue: _.map(result, ({data}) => data.length).reduce((total, l) => total + l, 0),
            secondaryValue: null,
            clickable: true
        };
    }

    getResultForApprovalCardsType(type, reportFilters) {
        const approvalStatus_status = getApprovalStatusForType(type);
        return this.getService(EntityApprovalStatusService).getAllEntitiesForReports(approvalStatus_status, reportFilters);
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

    getResultForDefaultCardsType(type, reportFilters) {
        const individualService = this.getService(IndividualService);
        const typeToMethodMap = new Map([
            [StandardReportCardType.type.ScheduledVisits, individualService.allScheduledVisitsIn],
            [StandardReportCardType.type.OverdueVisits, individualService.allOverdueVisitsIn],
            [StandardReportCardType.type.LatestVisits, individualService.recentlyCompletedVisitsIn],
            [StandardReportCardType.type.LatestRegistrations, individualService.recentlyRegistered],
            [StandardReportCardType.type.LatestEnrolments, individualService.recentlyEnrolled],
            [StandardReportCardType.type.Total, individualService.allIn],
            [StandardReportCardType.type.DueChecklist, individualService.dueChecklists.individual]
        ]);
        const resultFunc = typeToMethodMap.get(type);
        const result = type === StandardReportCardType.type.Total ? resultFunc(undefined, reportFilters) : resultFunc(new Date(), reportFilters);
        const sortedResult = type === StandardReportCardType.type.Total ? result : _.orderBy(result, ({visitInfo}) => visitInfo.sortingBy, 'desc');
        return {status: type, result: sortedResult}
    }

    getCountForDefaultCardsType(type, reportFilters) {
        return {
            primaryValue: this.getResultForDefaultCardsType(type, reportFilters).result.length,
            secondaryValue: null,
            clickable: true
        };
    }

    getResultForChecklistCardType(type, reportFilters) {
        const individualService = this.getService(IndividualService);
        return {status: type, result: individualService.dueChecklists(undefined, reportFilters)};
    }

    getCountForChecklistCardType(type, reportFilters) {
        return {
            primaryValue: this.getResultForChecklistCardType(type, reportFilters).result.individual.length,
            secondaryValue: null,
            clickable: true
        };
    }

    getReportCardCount(reportCard, reportFilters) {
        General.logDebug("ReportCardService", `Executing report card: ${reportCard.name}`);
        General.logDebugTemp("ReportCardService", JSONStringify(reportFilters, 5));
        const standardReportCardType = reportCard.standardReportCardType;
        switch (true) {
            case _.isNil(standardReportCardType) :
                return this.getService(RuleEvaluationService).getDashboardCardCount(reportCard, reportFilters);
            case standardReportCardType.isApprovalType() :
                return this.getCountForApprovalCardsType(standardReportCardType.name, reportFilters);
            case standardReportCardType.isDefaultType() :
                return this.getCountForDefaultCardsType(standardReportCardType.name, reportFilters);
            case standardReportCardType.isCommentType() :
                return this.getCountForCommentCardType();
            case standardReportCardType.isTaskType() :
                return this.getCountForTaskCardType(standardReportCardType.getTaskTypeType());
            case standardReportCardType.isChecklistType() :
                return this.getCountForChecklistCardType(standardReportCardType.name, reportFilters);
        }
    }

    getReportCardResult(reportCard, reportFilters) {
        General.logDebug("ReportCardService", `Executing report card: ${reportCard.name}`);
        const standardReportCardType = reportCard.standardReportCardType;
        switch (true) {
            case _.isNil(standardReportCardType) : {
                const result = this.getService(RuleEvaluationService).getDashboardCardQueryResult(reportCard, reportFilters);
                return {status: null, result};
            }
            case standardReportCardType.isApprovalType() :
                return this.getResultForApprovalCardsType(standardReportCardType.name, reportFilters);
            case standardReportCardType.isDefaultType() :
                return this.getResultForDefaultCardsType(standardReportCardType.name, reportFilters);
            case standardReportCardType.isCommentType() : {
                return {status: null, result: this.getResultForCommentCardType()};
            }
            case standardReportCardType.isChecklistType() :
                return this.getResultForChecklistCardType(standardReportCardType.name, reportFilters);
        }
    }

    getStandardReportCardResultForEntity(reportCard, schemaAndQueryFilter) {
        const status = getApprovalStatusForType(reportCard.standardReportCardType.name);
        const {schema, filterQuery} = schemaAndQueryFilter;
        return this.getService(EntityApprovalStatusService).getAllEntitiesWithStatus(status, schema, filterQuery)
    }

}

export default ReportCardService
