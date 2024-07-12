import BaseService from "../BaseService";
import Service from "../../framework/bean/Service";
import {ReportCard, StandardReportCardType} from "openchs-models";
import EntityApprovalStatusService from "../EntityApprovalStatusService";
import RuleEvaluationService from "../RuleEvaluationService";
import IndividualService from "../IndividualService";
import CommentService from "../comment/CommentService";
import _ from "lodash";
import TaskService from "../task/TaskService";
import General from "../../utility/General";
import {DashboardReportFilter} from "../../model/DashboardReportFilter";
import ReportCardQueryBuilder from "./ReportCardQueryBuilder";
import {ReportCardResult} from "openchs-models";

@Service("reportCardService")
class ReportCardService extends BaseService {
    constructor(db, context) {
        super(db, context);
    }

    getSchema() {
        return ReportCard.schema.name;
    }

    getCountForApprovalCardsType(standardReportCardType, reportFilters) {
        const approvalStatus_status = standardReportCardType.getApprovalStatusForType();
        const {result} = this.getService(EntityApprovalStatusService).getAllEntitiesForReports(approvalStatus_status, reportFilters);
        return ReportCardResult.create(_.map(result, ({data}) => data.length).reduce((total, l) => total + l, 0), null, true);
    }

    getResultForApprovalCardsType(standardReportCardType, reportFilters, formMapping) {
        const approvalStatus_status = standardReportCardType.getApprovalStatusForType();
        return this.getService(EntityApprovalStatusService).getAllSubjects(approvalStatus_status, reportFilters, formMapping);
    }

    getCountForCommentCardType(reportFilters) {
        return ReportCardResult.create(this.getResultForCommentCardType(reportFilters).length, null, true);
    }

    getResultForCommentCardType(reportFilters) {
        return this.getService(CommentService).getAllOpenCommentThreads(reportFilters);
    }

    getCountForTaskCardType(taskTypeType, reportFilters) {
        return ReportCardResult.create(this.getResultForTaskCardType(taskTypeType, reportFilters).length, null, true);
    }

    getResultForTaskCardType(taskTypeType, filters) {
        return this.getService(TaskService).getIncompleteTasks(taskTypeType, filters);
    }

    getResultForDefaultCardsType(reportFilters, reportCard) {
        const individualService = this.getService(IndividualService);
        const typeToMethodMap = new Map([
            [StandardReportCardType.type.ScheduledVisits, individualService.allScheduledVisitsIn],
            [StandardReportCardType.type.OverdueVisits, individualService.allOverdueVisitsIn],
            [StandardReportCardType.type.DueChecklist, individualService.dueChecklists.individual]
        ]);
        const standardReportCardTypeName = reportCard.standardReportCardType.name;
        const resultFunc = typeToMethodMap.get(standardReportCardTypeName);

        const programEncounterCriteria = ReportCardQueryBuilder.getProgramEncounterCriteria(reportCard);
        const generalEncounterCriteria = ReportCardQueryBuilder.getGeneralEncounterCriteria(reportCard);
        const date = DashboardReportFilter.getAsOnDate(reportFilters);
        let result;
        if (standardReportCardTypeName === StandardReportCardType.type.Total) {
            result = individualService.allInV2(date, reportFilters, ReportCardQueryBuilder.getSubjectCriteria(reportCard));
        } else if (standardReportCardTypeName === StandardReportCardType.type.RecentEnrolments) {
            result = individualService.recentlyEnrolled(date, reportFilters, ReportCardQueryBuilder.getProgramEnrolmentCriteria(reportCard), reportCard.getStandardReportCardInputRecentDuration());
        } else if (standardReportCardTypeName === StandardReportCardType.type.RecentRegistrations) {
            result = individualService.recentlyRegisteredV2(date, reportFilters, ReportCardQueryBuilder.getSubjectCriteria(reportCard), reportCard.getStandardReportCardInputRecentDuration());
        } else if (standardReportCardTypeName === StandardReportCardType.type.RecentVisits) {
            result = individualService.recentlyCompletedVisitsIn(date, reportFilters, programEncounterCriteria, generalEncounterCriteria, true, true,
                reportCard.getStandardReportCardInputRecentDuration());
        } else {
            result = resultFunc(date, reportFilters, programEncounterCriteria, generalEncounterCriteria);
        }
        const sortedResult = _.orderBy(result, ({visitInfo}) => visitInfo.sortingBy, 'desc');
        return {status: standardReportCardTypeName, result: sortedResult};
    }

    getCountForDefaultCardsType(reportFilters, reportCard) {
        return ReportCardResult.create(this.getResultForDefaultCardsType(reportFilters, reportCard).result.length, null, true);
    }

    getResultForChecklistCardType(type, reportFilters) {
        const individualService = this.getService(IndividualService);
        return {status: type, result: individualService.dueChecklists(undefined, reportFilters)};
    }

    getCountForChecklistCardType(type, reportFilters) {
        return ReportCardResult.create(this.getResultForChecklistCardType(type, reportFilters).result.individual.length, null, true);
    }

    getReportCardCount(reportCard, reportFilters) {
        General.logDebug("ReportCardService", `Executing report card: ${reportCard.name}`);
        const standardReportCardType = reportCard.standardReportCardType;
        switch (true) {
            case _.isNil(standardReportCardType) :
                return this.getService(RuleEvaluationService).getDashboardCardResult(reportCard, reportFilters);
            case standardReportCardType.isApprovalType() :
                return this.getCountForApprovalCardsType(standardReportCardType, reportFilters);
            case standardReportCardType.isDefaultType() :
                return this.getCountForDefaultCardsType(reportFilters, reportCard);
            case standardReportCardType.isCommentType() :
                return this.getCountForCommentCardType(reportFilters);
            case standardReportCardType.isTaskType() :
                return this.getCountForTaskCardType(standardReportCardType.getTaskTypeType(), reportFilters);
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
                return {status: null, result: this.getResultForApprovalCardsType(standardReportCardType, reportFilters)};
            case standardReportCardType.isDefaultType() :
                return this.getResultForDefaultCardsType(reportFilters, reportCard);
            case standardReportCardType.isCommentType() :
                return {status: null, result: this.getResultForCommentCardType(reportFilters)};
            case standardReportCardType.isChecklistType() :
                return this.getResultForChecklistCardType(standardReportCardType.name, reportFilters);
        }
    }

    /**
     * This is a utility method to be used whenever we need to fetch the ReportCard RealmDB entity,
     * using a CustomDashboard ReportCard UUID.
     * This is because, we would have set / overwritten the reportCardUUID field to a string value,
     * made up by concatenating ReportCard V4_UUID + '#' + index of the Nested Report Card.
     *
     * @param reportCardUUID
     * @returns {string} Strips off the trailing '#' and Index value and returns just the plain V4 UUID value
     */
    getPlainUUIDFromCompositeReportCardUUID(reportCardUUID) {
        return reportCardUUID && (typeof reportCardUUID === 'string' || reportCardUUID instanceof String)
            ? reportCardUUID.substring(0, reportCardUUID.indexOf('#')) : null;
    }
}

export default ReportCardService
