import BaseService from "../BaseService";
import Service from "../../framework/bean/Service";
import _ from "lodash";
import moment from "moment";
import {AttendanceRecord} from "avni-models";
import AttendanceRecordService from "../AttendanceRecordService";
import IndividualService from "../IndividualService";
import ConceptService from "../ConceptService";
import MessageService from "../MessageService";
import PDFGenerationService, {PAGE} from "../PDFGenerationService";

// WhatsApp truncates long messages — cap the inlined absent list so the footer
// stays in the preview pane for sessions with 50+ absentees.
const DEFAULT_ABSENT_NAME_CAP = 30;

function escapeHtml(value) {
    if (_.isNil(value)) return "";
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function snakeCase(str) {
    const out = _.snakeCase(_.deburr(String(str || "")));
    return _.isEmpty(out) ? "session" : out;
}

const PDF_STYLES = `
<style>
    @page { size: ${PAGE.name} ${PAGE.orientation}; margin: ${PAGE.marginTopMm}mm 0 ${PAGE.marginBottomMm}mm 0; }
    @page :first { margin: 0 0 ${PAGE.marginBottomMm}mm 0; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    body { font-family: Roboto, Arial, sans-serif; color: #222; font-size: 12pt; }
    table.page { width: 100%; border-collapse: collapse; table-layout: fixed; }
    table.page > tbody > tr > td { padding: 0; vertical-align: top; }
    table.page > tfoot { display: table-footer-group; }
    .session-header { background: #5a5a5a; color: #ffffff; padding: 12pt 14mm; }
    .session-title { font-size: 15pt; font-weight: 700; color: #ffffff; }
    .session-meta { font-size: 11pt; color: #cfcfcf; margin-top: 3pt; }
    .content { padding: 10pt 14mm 12pt 14mm; }
    .summary-line { font-size: 12pt; color: #222; margin: 0 0 10pt 0; font-weight: 500; }
    .session-notes-label { font-size: 10pt; color: #666; margin: 8pt 0 2pt 0; text-transform: uppercase; letter-spacing: 0.5pt; }
    .session-notes { font-size: 11pt; color: #222; margin: 0 0 10pt 0; white-space: pre-wrap; }
    table.roster { width: 100%; border-collapse: collapse; margin: 0; table-layout: fixed; }
    table.roster th, table.roster td { border-bottom: 0.5pt solid #e0e0e0; padding: 6pt 8pt; vertical-align: top; text-align: left; }
    table.roster th { font-size: 10pt; font-weight: 700; color: #555; background: #ececec; text-transform: uppercase; letter-spacing: 0.5pt; }
    table.roster td.name { width: 45%; color: #111; }
    table.roster td.status { width: 20%; color: #444; }
    table.roster td.reason { width: 35%; color: #666; }
    .status-absent { color: #b00020; font-weight: 600; }
    .footer-inner { padding: 6pt 14mm 0 14mm; border-top: 0.5pt solid #ccc; font-size: 9pt; color: #888; text-align: center; }
    .didnt-happen-banner { background: #fff3e0; color: #e65100; padding: 8pt 12pt; margin: 0 0 10pt 0; font-size: 11pt; font-weight: 600; }
</style>`;

@Service("sessionShareAdapter")
class SessionShareAdapter extends BaseService {
    constructor(db, beanStore) {
        super(db, beanStore);
    }

    init() {
        this.I18n = this.getService(MessageService).getI18n();
    }

    buildContext(session, attendanceType, groupSubject) {
        const recordService = this.getService(AttendanceRecordService);
        const individualService = this.getService(IndividualService);
        const conceptService = this.getService(ConceptService);

        const rawRecords = recordService.findBySession(session.uuid) || [];
        const attendanceRecords = rawRecords
            .filter(r => !r.voided)
            .map(r => {
                const student = individualService.findByUUID(r.subjectUUID);
                const studentName = student ? student.nameString : "";
                const reasonNames = (r.reasonConceptUUIDs || [])
                    .map(uuid => {
                        const concept = conceptService.getConceptByUUID(uuid);
                        return concept && concept.name ? this.I18n.t(concept.name) : null;
                    })
                    .filter(Boolean);
                const entry = {studentName, status: r.status};
                if (reasonNames.length) entry.reasonName = reasonNames.join(", ");
                if (r.followUpEncounterUUID) entry.followUpEncounterUUID = r.followUpEncounterUUID;
                return entry;
            });

        // Counts include records with unresolved names so they match the roster table rows.
        const presentRecords = attendanceRecords.filter(r => r.status === AttendanceRecord.status.PRESENT);
        const absentRecords = attendanceRecords.filter(r => r.status === AttendanceRecord.status.ABSENT);
        const presentNames = presentRecords.map(r => r.studentName).filter(n => !_.isEmpty(n));
        const absentNames = absentRecords.map(r => r.studentName).filter(n => !_.isEmpty(n));

        const summary = {
            groupName: groupSubject ? groupSubject.nameString : "",
            attendanceTypeName: attendanceType ? attendanceType.name : "",
            scheduledDate: session.scheduledDate,
            presentCount: presentRecords.length,
            absentCount: absentRecords.length,
            presentNames,
            absentNames,
            sessionStatus: session.status,
            sessionNotes: session.notes || "",
        };

        return {entity: session, attendanceType, attendanceRecords, summary};
    }

    defaultHtmlFromSummary(summary, attendanceRecords) {
        const footerText = this.getService(PDFGenerationService).getFooterText();
        const dateLabel = this._formatDisplayDate(summary.scheduledDate);
        const header = `
            <div class="session-header">
                <div class="session-title">${escapeHtml(summary.groupName)}</div>
                <div class="session-meta">${escapeHtml(summary.attendanceTypeName)} · ${escapeHtml(dateLabel)}</div>
            </div>`;

        const didntHappen = summary.sessionStatus === "DidntHappen";
        const banner = didntHappen
            ? `<div class="didnt-happen-banner">${escapeHtml(this.I18n.t("attendanceShareDidntHappenBanner"))}</div>`
            : "";

        const summaryLine = didntHappen
            ? ""
            : `<div class="summary-line">${escapeHtml(this.I18n.t("attendanceShareSummaryLine", {present: summary.presentCount, absent: summary.absentCount}))}</div>`;

        const notesBlock = !_.isEmpty(summary.sessionNotes)
            ? `<div class="session-notes-label">${escapeHtml(this.I18n.t("sessionNotesOptional"))}</div>
               <div class="session-notes">${escapeHtml(summary.sessionNotes)}</div>`
            : "";

        const rosterRows = (attendanceRecords || []).map(r => {
            const statusKey = r.status === AttendanceRecord.status.PRESENT ? "present" : "absent";
            const statusLabel = escapeHtml(this.I18n.t(statusKey));
            const statusClass = r.status === AttendanceRecord.status.ABSENT ? "status-absent" : "";
            const reason = r.reasonName ? escapeHtml(r.reasonName) : "";
            return `<tr>
                <td class="name">${escapeHtml(r.studentName)}</td>
                <td class="status ${statusClass}">${statusLabel}</td>
                <td class="reason">${reason}</td>
            </tr>`;
        }).join("");

        const rosterTable = didntHappen
            ? ""
            : `<table class="roster">
                   <thead>
                       <tr>
                           <th>${escapeHtml(this.I18n.t("attendanceShareRosterName"))}</th>
                           <th>${escapeHtml(this.I18n.t("attendanceShareRosterStatus"))}</th>
                           <th>${escapeHtml(this.I18n.t("attendanceShareRosterReason"))}</th>
                       </tr>
                   </thead>
                   <tbody>${rosterRows}</tbody>
               </table>`;

        return `<!doctype html>
            <html><head><meta charset="utf-8"/>${PDF_STYLES}</head>
                <body>
                    <table class="page">
                        <tbody>
                            <tr>
                                <td>
                                    ${header}
                                    <div class="content">
                                        ${banner}
                                        ${summaryLine}
                                        ${notesBlock}
                                        ${rosterTable}
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                        <tfoot>
                            <tr><td><div class="footer-inner">${footerText}</div></td></tr>
                        </tfoot>
                    </table>
                </body>
            </html>`;
    }

    defaultTextFromSummary(summary, {absentNameCap = DEFAULT_ABSENT_NAME_CAP} = {}) {
        const dateLabel = this._formatDisplayDate(summary.scheduledDate);
        const head = this.I18n.t("attendanceShareTextHeader", {
            group: summary.groupName,
            type: summary.attendanceTypeName,
            date: dateLabel,
        });

        if (summary.sessionStatus === "DidntHappen") {
            return [head, this.I18n.t("attendanceShareDidntHappenText")]
                .filter(s => !_.isEmpty(s))
                .join(" — ");
        }

        const counts = this.I18n.t("attendanceShareTextCounts", {
            present: summary.presentCount,
            absent: summary.absentCount,
        });

        let absentList = "";
        if (summary.absentCount > 0) {
            const names = summary.absentNames || [];
            const visible = names.slice(0, absentNameCap);
            const remainder = names.length - visible.length;
            const joined = visible.join(", ");
            absentList = remainder > 0
                ? this.I18n.t("attendanceShareTextAbsentWithMore", {names: joined, count: remainder})
                : this.I18n.t("attendanceShareTextAbsent", {names: joined});
        }

        return [head, counts, absentList].filter(s => !_.isEmpty(s)).join(" ");
    }

    buildFileName(summary) {
        const stem = `${snakeCase(summary.groupName || "session")}_${snakeCase(summary.attendanceTypeName || "")}`;
        const date = summary.scheduledDate
            ? moment.utc(summary.scheduledDate, "YYYY-MM-DD").format("DD_MM_YYYY")
            : moment().format("DD_MM_YYYY");
        return `${stem}_${date}`;
    }

    _formatDisplayDate(scheduledDate) {
        if (_.isEmpty(scheduledDate)) return "";
        const m = moment.utc(scheduledDate, "YYYY-MM-DD");
        return m.isValid() ? m.format("ddd D MMM YYYY") : scheduledDate;
    }
}

export default SessionShareAdapter;
