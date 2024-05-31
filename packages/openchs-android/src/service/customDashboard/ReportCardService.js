import BaseService from "../BaseService";
import Service from "../../framework/bean/Service";
import {ReportCard, StandardReportCardType, ApprovalStatus} from "openchs-models";
import EntityApprovalStatusService from "../EntityApprovalStatusService";
import RuleEvaluationService from "../RuleEvaluationService";
import IndividualService from "../IndividualService";
import CommentService from "../comment/CommentService";
import _ from "lodash";
import TaskService from "../task/TaskService";
import General from "../../utility/General";
import RealmQueryService from "../query/RealmQueryService";

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
        return {
            primaryValue: _.map(result, ({data}) => data.length).reduce((total, l) => total + l, 0),
            secondaryValue: null,
            clickable: true
        };
    }

    getResultForApprovalCardsType(standardReportCardType, reportFilters, formMapping) {
        const approvalStatus_status = standardReportCardType.getApprovalStatusForType();
        return this.getService(EntityApprovalStatusService).getAllSubjects(approvalStatus_status, reportFilters, formMapping);
    }

    getCountForCommentCardType(reportFilters) {
        return {
            primaryValue: this.getResultForCommentCardType(reportFilters).length,
            secondaryValue: null,
            clickable: true
        };
    }

    getResultForCommentCardType(reportFilters) {
        return this.getService(CommentService).getAllOpenCommentThreads(reportFilters);
    }

    getCountForTaskCardType(taskTypeType, reportFilters) {
        return {
            primaryValue: this.getResultForTaskCardType(taskTypeType, reportFilters).length,
            secondaryValue: null,
            clickable: true
        };
    }

    getResultForTaskCardType(taskTypeType, filters) {
        return this.getService(TaskService).getIncompleteTasks(taskTypeType, filters);
    }

    getResultForDefaultCardsType(reportFilters, reportCard) {
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
        const standardReportCardTypeName = reportCard.standardReportCardType.name;
        const resultFunc = typeToMethodMap.get(standardReportCardTypeName);

        const programEncounterCriteria = RealmQueryService.programEncounterCriteria(reportCard.standardReportCardInputSubjectTypes,
            reportCard.standardReportCardInputPrograms, reportCard.standardReportCardInputEncounterTypes);
        const generalEncounterCriteria = RealmQueryService.generalEncounterCriteria(reportCard.standardReportCardInputSubjectTypes, reportCard.standardReportCardInputEncounterTypes);
        const result = standardReportCardTypeName === StandardReportCardType.type.Total ? resultFunc(undefined, reportFilters) : resultFunc(new Date(), reportFilters, programEncounterCriteria, generalEncounterCriteria);
        const sortedResult = standardReportCardTypeName === StandardReportCardType.type.Total ? result : _.orderBy(result, ({visitInfo}) => visitInfo.sortingBy, 'desc');
        return {status: standardReportCardTypeName, result: sortedResult};
    }

    getCountForDefaultCardsType(reportFilters, reportCard) {
        return {
            primaryValue: this.getResultForDefaultCardsType(reportFilters, reportCard).result.length,
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
        const standardReportCardType = reportCard.standardReportCardType;
        switch (true) {
            case _.isNil(standardReportCardType) :
                return this.getService(RuleEvaluationService).getDashboardCardCount(reportCard, reportFilters);
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
