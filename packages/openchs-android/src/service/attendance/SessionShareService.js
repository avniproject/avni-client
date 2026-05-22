import BaseService from "../BaseService";
import Service from "../../framework/bean/Service";
import _ from "lodash";
import Share from "react-native-share";
import General from "../../utility/General";
import ErrorUtil from "../../framework/errorHandling/ErrorUtil";
import RuleEvaluationService from "../RuleEvaluationService";
import PDFGenerationService from "../PDFGenerationService";
import SessionShareAdapter from "./SessionShareAdapter";

// Orchestrates the Session share flow: adapter → rule eval → renderer → native
// share-sheet. Mirrors FormShareService for sessions but is much smaller
// because Sessions don't carry observations / forms / S3 templates.
@Service("sessionShareService")
class SessionShareService extends BaseService {
    constructor(db, beanStore) {
        super(db, beanStore);
    }

    async sharePdf(session, attendanceType, groupSubject) {
        const {ctx, ruleOut} = this._runAdapterAndRule(session, attendanceType, groupSubject);
        const adapter = this.getService(SessionShareAdapter);

        // Rule's `data` is interpreted the same way the form path interprets it:
        // an object of substitution values for a Mustache template. The Session
        // path has no S3 custom template (v1) — we always render against the
        // built-in default HTML. If `data` is present, we merge it onto the
        // summary so authors can override individual fields without rewriting
        // the whole template.
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
