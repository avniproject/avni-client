import BaseService from "../BaseService";
import Service from "../../framework/bean/Service";
import _ from "lodash";
import Share from "react-native-share";
import General from "../../utility/General";
import ErrorUtil from "../../framework/errorHandling/ErrorUtil";
import RuleEvaluationService from "../RuleEvaluationService";
import PDFGenerationService from "../PDFGenerationService";
import SessionService from "../SessionService";
import AttendanceTypeService from "../AttendanceTypeService";
import IndividualService from "../IndividualService";
import SessionShareAdapter from "./SessionShareAdapter";

@Service("sessionShareService")
class SessionShareService extends BaseService {
    constructor(db, beanStore) {
        super(db, beanStore);
    }

    async sharePdf(session, attendanceType, groupSubject) {
        const {ctx, ruleOut} = this._runAdapterAndRule(session, attendanceType, groupSubject);
        const adapter = this.getService(SessionShareAdapter);

        const mergedSummary = _.isPlainObject(ruleOut?.data)
            ? _.merge({}, ctx.summary, ruleOut.data)
            : ctx.summary;

        const html = adapter.defaultHtmlFromSummary(mergedSummary, ctx.attendanceRecords);
        const fileName = adapter.buildFileName(ctx.summary);
        return this.getService(PDFGenerationService).shareHtmlAsPdf(html, fileName);
    }

    shareText(session, attendanceType, groupSubject) {
        const {ctx, ruleOut} = this._runAdapterAndRule(session, attendanceType, groupSubject);
        const adapter = this.getService(SessionShareAdapter);

        const text = (_.isString(ruleOut?.text) && !_.isEmpty(ruleOut.text))
            ? ruleOut.text
            : adapter.defaultTextFromSummary(ctx.summary);

        return Share.open({
            message: text,
            type: "text/plain",
            failOnCancel: false,
        }).catch((err) => {
            if (err?.message === "User did not share" || err?.error === "User did not share") return;
            General.logError("SessionShareService.shareText", err);
            ErrorUtil.notifyBugsnag(err, "SessionShareService");
        });
    }

    async dispatchShareSessionWorkItem(workItem) {
        if (!workItem) return;
        try {
            workItem.validate();
        } catch (err) {
            General.logError("SessionShareService.dispatchShareSessionWorkItem", `validate failed: ${err.message}`);
            this._recordFailure(err, workItem);
            return;
        }

        const params = workItem.parameters || {};
        const sessionUUID = params.sessionUUID;
        const session = this.getService(SessionService).findByUUID(sessionUUID);
        if (!this._isLiveEntity(session)) {
            const err = new Error(`SHARE_SESSION sessionUUID '${sessionUUID}' did not resolve to a live session`);
            General.logError("SessionShareService.dispatchShareSessionWorkItem", err.message);
            this._recordFailure(err, workItem);
            return;
        }

        const attendanceType = this.getService(AttendanceTypeService).findByUUID(session.attendanceTypeUUID);
        if (!this._isLiveEntity(attendanceType)) {
            const err = new Error(`SHARE_SESSION attendanceTypeUUID '${session.attendanceTypeUUID}' did not resolve to a live attendance type`);
            General.logError("SessionShareService.dispatchShareSessionWorkItem", err.message);
            this._recordFailure(err, workItem);
            return;
        }

        const groupSubject = this.getService(IndividualService).findByUUID(session.groupSubjectUUID);
        if (!this._isLiveEntity(groupSubject)) {
            const err = new Error(`SHARE_SESSION groupSubjectUUID '${session.groupSubjectUUID}' did not resolve to a live group subject`);
            General.logError("SessionShareService.dispatchShareSessionWorkItem", err.message);
            this._recordFailure(err, workItem);
            return;
        }

        const format = params.format;
        try {
            if (format === "pdf") return await this.sharePdf(session, attendanceType, groupSubject);
            if (format === "text") return await this.shareText(session, attendanceType, groupSubject);
            const err = new Error(`SHARE_SESSION work item has unsupported format '${format}'`);
            General.logError("SessionShareService.dispatchShareSessionWorkItem", err.message);
            this._recordFailure(err, workItem);
        } catch (err) {
            General.logError("SessionShareService.dispatchShareSessionWorkItem", `dispatch failed: ${err.message}`);
            this._recordFailure(err, workItem);
        }
    }

    _isLiveEntity(entity) {
        return !!entity && !entity.voided;
    }

    _recordFailure(err, workItem) {
        try {
            this.getService(RuleEvaluationService).recordWorkListUpdationFailure(err, null, {workItem});
        } catch (logErr) {
            General.logError("SessionShareService._recordFailure", logErr);
            ErrorUtil.notifyBugsnag(logErr, "SessionShareService");
        }
    }

    _runAdapterAndRule(session, attendanceType, groupSubject) {
        const adapter = this.getService(SessionShareAdapter);
        const ctx = adapter.buildContext(session, attendanceType, groupSubject);
        const shareRule = attendanceType && _.isFunction(attendanceType.getShareRule)
            ? attendanceType.getShareRule()
            : null;
        const ruleOut = this.getService(RuleEvaluationService).runSessionShareRule(
            shareRule, session, attendanceType, ctx.attendanceRecords, ctx.summary
        );
        return {ctx, ruleOut};
    }
}

export default SessionShareService;
