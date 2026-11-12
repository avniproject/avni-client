import BaseService from "../BaseService";
import Service from "../../framework/bean/Service";
import {Individual, ReportCard, StandardReportCardType} from "openchs-models";
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
import RealmQueryService from "../query/RealmQueryService";
import {JSONStringify} from "../../utility/JsonStringify";

function getProgramEncounterCriteria(reportCard, formMetaData) {
    let programEncounterCriteria = ReportCardQueryBuilder.getProgramEncounterCriteriaForReportCard(reportCard);
    const programEncounterCriteriaForUserFilter = ReportCardQueryBuilder.getProgramEncounterCriteria(formMetaData.subjectTypes, formMetaData.programs, formMetaData.encounterTypes);
    if (!_.isEmpty(programEncounterCriteriaForUserFilter))
        programEncounterCriteria = RealmQueryService.andQuery([programEncounterCriteria, programEncounterCriteriaForUserFilter]);
    return programEncounterCriteria;
}

function getGeneralEncounterCriteria(reportCard, formMetaData) {
    let generalEncounterCriteria = ReportCardQueryBuilder.getGeneralEncounterCriteriaForReportCard(reportCard);
    const generalEncounterForUserFilter = ReportCardQueryBuilder.getGeneralEncounterCriteria(formMetaData.subjectTypes, formMetaData.encounterTypes);
    if (!_.isEmpty(generalEncounterForUserFilter))
        generalEncounterCriteria = RealmQueryService.andQuery([generalEncounterCriteria, generalEncounterForUserFilter]);
    return generalEncounterCriteria;
}

function getProgramEnrolmentCriteria(reportCard, formMetaData) {
    let programEnrolmentCriteria = ReportCardQueryBuilder.getProgramEnrolmentCriteriaForReportCard(reportCard);
    const programEnrolmentCriteriaForUserFilter = ReportCardQueryBuilder.getProgramEnrolmentCriteria(formMetaData.subjectTypes, formMetaData.programs);
    if (!_.isEmpty(programEnrolmentCriteriaForUserFilter))
        programEnrolmentCriteria = RealmQueryService.andQuery([programEnrolmentCriteria, programEnrolmentCriteriaForUserFilter]);
    return programEnrolmentCriteria;
}

function getSubjectCriteria(reportCard, formMetaData) {
    let subjectCriteria = ReportCardQueryBuilder.getSubjectCriteriaForReportCard(reportCard);
    const subjectCriteriaForUserFilter = ReportCardQueryBuilder.getSubjectCriteria(formMetaData.subjectTypes, formMetaData.programs, formMetaData.encounterTypes);
    if (!_.isEmpty(subjectCriteriaForUserFilter))
        subjectCriteria = RealmQueryService.andQuery([subjectCriteria, subjectCriteriaForUserFilter]);
    return subjectCriteria;
}

// A bare database object turns up when a query reaches past the model wrappers.
function toSubject(row) {
    const candidate = _.get(row, 'individual') || row;
    if (candidate instanceof Individual) return candidate;
    if (!_.isNil(candidate) && _.isNil(candidate.that) && _.isFunction(candidate.objectSchema)
        && _.get(candidate.objectSchema(), 'name') === Individual.schema.name) return new Individual(candidate);
    return null;
}

// A failed query reaches here as nothing, or as error results on a nested card.
function isQueryError(result) {
    if (_.isNil(result) || result.hasErrorMsg === true) return true;
    return Array.isArray(result) && result.length > 0 && result.every(r => r && r.hasErrorMsg === true);
}

export function toApprovalListSubjects(result) {
    if (_.isNil(result) || !(Array.isArray(result) || _.isFunction(result[Symbol.iterator]))) return [];
    const seen = new Set();
    const subjects = [];
    for (const row of result) {
        const subject = toSubject(row);
        if (_.isNil(subject) || _.isNil(subject.uuid) || seen.has(subject.uuid)) continue;
        seen.add(subject.uuid);
        subjects.push(subject);
    }
    return subjects;
}

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

    getResultForCustomApprovalCard(reportCard, reportFilters) {
        const result = this.getService(RuleEvaluationService).getDashboardCardQueryResult(reportCard, reportFilters);
        // A failed query must not open an empty list; the tap then does nothing, like any custom card.
        if (isQueryError(result)) return null;
        return toApprovalListSubjects(result);
    }

    // The tile shows the number of subjects the approval list will show, not the query's rows.
    getCountForCustomApprovalCard(reportCard, reportFilters) {
        const ruleService = this.getService(RuleEvaluationService);
        const queryResult = ruleService.executeDashboardCardRule(reportCard, reportFilters);
        const tile = ruleService.toDashboardCardResult(reportCard, queryResult);
        const subjectCount = (lineListFunction) => _.toString(toApprovalListSubjects(ruleService.runLineListFunction(reportCard, lineListFunction)).length);
        if (reportCard.nested) {
            if (!Array.isArray(tile) || !Array.isArray(_.get(queryResult, "reportCards"))) return tile;
            return tile.map((result, index) => {
                const lineListFunction = _.get(queryResult.reportCards[index], "lineListFunction");
                if (result.hasErrorMsg || !_.isFunction(lineListFunction)) return result;
                result.primaryValue = subjectCount(lineListFunction);
                return result;
            });
        }
        if (_.isNil(tile) || tile.hasErrorMsg) return tile;
        if (ruleService.isOldStyleQueryResult(queryResult)) return ReportCardResult.create(toApprovalListSubjects(queryResult).length, null, true);
        if (_.isFunction(queryResult.lineListFunction)) tile.primaryValue = subjectCount(queryResult.lineListFunction);
        return tile;
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
            [StandardReportCardType.types.ScheduledVisits, individualService.allScheduledVisitsIn],
            [StandardReportCardType.types.OverdueVisits, individualService.allOverdueVisitsIn]
        ]);
        const standardReportCardTypeName = reportCard.standardReportCardType.type;
        const resultFunc = typeToMethodMap.get(standardReportCardTypeName);

        const formMetaData = DashboardReportFilter.getFormMetaDataFilterValues(reportFilters);

        const date = DashboardReportFilter.getAsOnDate(reportFilters);
        let result;
        if (standardReportCardTypeName === StandardReportCardType.types.Total) {
            result = individualService.allInV2(date, reportFilters, getSubjectCriteria(reportCard, formMetaData));
        } else if (standardReportCardTypeName === StandardReportCardType.types.RecentEnrolments) {
            result = individualService.recentlyEnrolled(date, reportFilters, getProgramEnrolmentCriteria(reportCard, formMetaData), reportCard.getStandardReportCardInputRecentDuration());
        } else if (standardReportCardTypeName === StandardReportCardType.types.RecentRegistrations) {
            result = individualService.recentlyRegisteredV2(date, reportFilters, getSubjectCriteria(reportCard, formMetaData), reportCard.getStandardReportCardInputRecentDuration());
        } else if (standardReportCardTypeName === StandardReportCardType.types.RecentVisits) {
            result = individualService.recentlyCompletedVisitsIn(date, reportFilters, getProgramEncounterCriteria(reportCard, formMetaData), getGeneralEncounterCriteria(reportCard, formMetaData), true, true,
                reportCard.getStandardReportCardInputRecentDuration());
        } else {
            result = resultFunc(date, reportFilters, getProgramEncounterCriteria(reportCard, formMetaData), getGeneralEncounterCriteria(reportCard, formMetaData));
        }
        const sortedResult = _.orderBy(result, ({visitInfo}) => visitInfo.sortingBy, 'desc');
        return {status: standardReportCardTypeName, result: sortedResult};
    }

    getCountForDefaultCardsType(reportFilters, reportCard) {
        const individualService = this.getService(IndividualService);
        const standardReportCardTypeName = reportCard.standardReportCardType.type;
        const formMetaData = DashboardReportFilter.getFormMetaDataFilterValues(reportFilters);
        const date = DashboardReportFilter.getAsOnDate(reportFilters);

        let count;
        if (standardReportCardTypeName === StandardReportCardType.types.ScheduledVisits) {
            count = individualService.countScheduledVisits(date, reportFilters, getProgramEncounterCriteria(reportCard, formMetaData), getGeneralEncounterCriteria(reportCard, formMetaData));
        } else if (standardReportCardTypeName === StandardReportCardType.types.OverdueVisits) {
            count = individualService.countOverdueVisits(date, reportFilters, getProgramEncounterCriteria(reportCard, formMetaData), getGeneralEncounterCriteria(reportCard, formMetaData));
        } else if (standardReportCardTypeName === StandardReportCardType.types.Total) {
            count = individualService.countAllIn(date, reportFilters, getSubjectCriteria(reportCard, formMetaData));
        } else if (standardReportCardTypeName === StandardReportCardType.types.RecentRegistrations) {
            count = individualService.countRecentlyRegistered(date, reportFilters, getSubjectCriteria(reportCard, formMetaData), reportCard.getStandardReportCardInputRecentDuration());
        } else if (standardReportCardTypeName === StandardReportCardType.types.RecentEnrolments) {
            count = individualService.countRecentlyEnrolled(date, reportFilters, getProgramEnrolmentCriteria(reportCard, formMetaData), reportCard.getStandardReportCardInputRecentDuration());
        } else if (standardReportCardTypeName === StandardReportCardType.types.RecentVisits) {
            count = individualService.countRecentlyCompletedVisits(date, reportFilters, getProgramEncounterCriteria(reportCard, formMetaData), getGeneralEncounterCriteria(reportCard, formMetaData), reportCard.getStandardReportCardInputRecentDuration());
        } else {
            count = this.getResultForDefaultCardsType(reportFilters, reportCard).result.length;
        }
        return ReportCardResult.create(count, null, true);
    }

    getResultForChecklistCardType(type, reportFilters) {
        const individualService = this.getService(IndividualService);
        return {status: type, result: individualService.dueChecklists(undefined, reportFilters)};
    }

    getCountForChecklistCardType(type, reportFilters) {
        return ReportCardResult.create(this.getResultForChecklistCardType(type, reportFilters).result.individual.length, null, true);
    }

    getCountForFullyCustomCard(reportCard, reportFilters) {
        const data = this.getService(RuleEvaluationService)
            .executeCustomCardDataRule(reportCard.customCardConfig, reportFilters) || {};
        const primaryValue = _.isNil(data.primaryValue) ? "" : data.primaryValue;
        const secondaryValue = _.isNil(data.secondaryValue) ? "" : data.secondaryValue;
        const result = ReportCardResult.create(primaryValue, secondaryValue, true, !!data.hasErrorMsg);
        if (!_.isNil(data.name)) result.cardName = data.name;
        if (data.colors && !_.isNil(data.colors.background)) result.cardColor = data.colors.background;
        if (data.colors && !_.isNil(data.colors.text)) result.textColor = data.colors.text;
        return result;
    }

    getReportCardCount(reportCard, reportFilters) {
        General.logDebug("ReportCardService", `Executing report card: ${reportCard.name}`);
        const standardReportCardType = reportCard.standardReportCardType;
        switch (true) {
            case reportCard.isFullyCustom() :
                return this.getCountForFullyCustomCard(reportCard, reportFilters);
            case _.isNil(standardReportCardType) && !_.isNil(reportCard.getApprovalStatusForCard()) :
                return this.getCountForCustomApprovalCard(reportCard, reportFilters);
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
            case _.isNil(standardReportCardType) && !_.isNil(reportCard.getApprovalStatusForCard()) :
                return {status: null, result: this.getResultForCustomApprovalCard(reportCard, reportFilters)};
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
