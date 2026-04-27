import BaseService from "./BaseService";
import Service from "../framework/bean/Service";
import moment from "moment";
import _ from "lodash";
import {Observation} from "avni-models";
import ConceptService from "./ConceptService";
import AddressLevelService from "./AddressLevelService";
import IndividualService from "./IndividualService";
import EncounterService from "./EncounterService";
import FormMappingService from "./FormMappingService";
import MessageService from "./MessageService";
import PDFGenerationService, {PAGE} from "./PDFGenerationService";
import General from "../utility/General";
import ErrorUtil from "../framework/errorHandling/ErrorUtil";

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
    return _.isEmpty(out) ? "form" : out;
}

const CONTENT_AREA_HEIGHT_MM = PAGE.heightMm - PAGE.marginBottomMm;

// Per-page footer: wrap the document in a <table> with <tfoot>. Chromium-based WebView (which
// Android's PrintDocumentAdapter uses) repeats <tfoot> at the bottom of every page.
// Explicit mm min-height pins the footer to the page bottom on single-page PDFs. We use mm
// (a physical unit WebView handles consistently in print) rather than 100vh, which is flaky
// in PrintDocumentAdapter and can float the footer mid-page. On multi-page PDFs the table
// just grows past the min-height and <tfoot> repeats on each page regardless.
// NOTE: on pages where the table content doesn't fill the page (typically the last page of a
// multi-page PDF), the <tfoot> is placed at the end of the content on that page rather than
// the physical page bottom. This is standard CSS paged-table behavior and cannot be worked
// around reliably in Android WebView without a native module.
const PDF_STYLES = `
<style>
    /* Default margins apply to page 2 onwards: top margin gives breathing room below the paper edge. */
    @page { size: ${PAGE.name} ${PAGE.orientation}; margin: ${PAGE.marginTopMm}mm 0 ${PAGE.marginBottomMm}mm 0; }
    /* Page 1 gets zero top margin so the dark subject header can bleed to the paper edge. */
    @page :first { margin: 0 0 ${PAGE.marginBottomMm}mm 0; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    body { font-family: Roboto, Arial, sans-serif; color: #222; font-size: 12pt; }
    table.page { width: 100%; min-height: ${CONTENT_AREA_HEIGHT_MM}mm; border-collapse: collapse; table-layout: fixed; }
    table.page > tbody > tr > td { padding: 0; vertical-align: top; }
    table.page > tfoot { display: table-footer-group; }
    table.page > tfoot > tr > td { padding: 0; }
    .subject-header { background: #5a5a5a; color: #ffffff; padding: 12pt 14mm; overflow-wrap: break-word; word-wrap: break-word; }
    .subject-name { font-size: 15pt; font-weight: 700; color: #ffffff; overflow-wrap: break-word; word-wrap: break-word; }
    .subject-details { font-size: 11pt; color: #cfcfcf; margin-top: 3pt; overflow-wrap: break-word; word-wrap: break-word; }
    .content { padding: 10pt 14mm 12pt 14mm; overflow-wrap: break-word; word-wrap: break-word; }
    h2.form-title { font-size: 13pt; margin: 4pt 0 2pt 0; color: #222; font-weight: 700; }
    .form-meta { font-size: 10pt; color: #666; margin: 0 0 10pt 0; }
    h3.section-heading { font-size: 10pt; font-weight: 700; letter-spacing: 0.5pt; text-transform: uppercase; margin: 10pt 0 0 0; padding: 5pt 8pt; background: #ececec; color: #555; border: none; }
    table.obs { width: 100%; border-collapse: collapse; margin: 0 0 6pt 0; table-layout: fixed; }
    table.obs td { border-bottom: 0.5pt solid #e0e0e0; padding: 6pt 8pt; vertical-align: top; overflow-wrap: break-word; word-wrap: break-word; word-break: break-word; }
    table.obs td.label { width: 45%; color: #666; font-weight: 400; }
    table.obs td.value { color: #111; font-weight: 500; white-space: pre-wrap; }
    table.obs tr.qg td.label { background: #f5f5f5; font-weight: 600; color: #222; }
    .qg-row { padding: 2pt 0 2pt 8pt; overflow-wrap: break-word; word-wrap: break-word; }
    .qg-label { color: #555; font-weight: 500; }
    .qg-value { white-space: pre-wrap; }
    .footer-inner { padding: 6pt 14mm 0 14mm; border-top: 0.5pt solid #ccc; font-size: 9pt; color: #888; text-align: center; overflow-wrap: break-word; word-wrap: break-word; }
</style>`;

@Service("formPDFService")
class FormPDFService extends BaseService {
    constructor(db, beanStore) {
        super(db, beanStore);
    }

    init() {
        this.I18n = this.getService(MessageService).getI18n();
    }

    _filterShareableObservations(observations) {
        return _.filter(observations, o => o?.concept && !o.concept.isMediaConcept());
    }

    _getObservationDisplayText(observation) {
        try {
            const displayable = Observation.valueForDisplay({
                observation,
                conceptService: this.getService(ConceptService),
                subjectService: this.getService(IndividualService),
                addressLevelService: this.getService(AddressLevelService),
                encounterService: this.getService(EncounterService),
                i18n: this.I18n,
            });
            if (_.isArray(displayable)) {
                return displayable.map(d => d?.displayValue).filter(x => !_.isNil(x)).join(", ");
            }
            return _.isNil(displayable?.displayValue) ? "" : String(displayable.displayValue);
        } catch (e) {
            General.logError("FormPDFService", `Failed to render observation for concept ${observation?.concept?.name}: ${e.message}`);
            ErrorUtil.notifyBugsnag(e, "FormPDFService");
            return "";
        }
    }

    _renderQuestionGroupHtml(observation) {
        try {
            const innerShareable = this._filterShareableObservations(observation.getValueWrapper().getValue());
            if (_.isEmpty(innerShareable)) return "";
            return innerShareable.map(o => {
                const label = escapeHtml(this.I18n.t(o.concept.name));
                const value = o.concept.isQuestionGroup()
                    ? this._renderQuestionGroupHtml(o)
                    : escapeHtml(this._getObservationDisplayText(o));
                return `<div class="qg-row"><span class="qg-label">${label}:</span> <span class="qg-value">${value}</span></div>`;
            }).join("");
        } catch (e) {
            General.logError("FormPDFService", `Failed to render question group ${observation?.concept?.name}: ${e.message}`);
            ErrorUtil.notifyBugsnag(e, "FormPDFService");
            return "";
        }
    }

    _buildObservationRow(o) {
        const label = escapeHtml(this.I18n.t(o.concept.name));
        const value = escapeHtml(this._getObservationDisplayText(o)) || "—";
        return `<tr><td class="label">${label}</td><td class="value">${value}</td></tr>`;
    }

    _buildQuestionGroupRows(o) {
        const label = escapeHtml(this.I18n.t(o.concept.name));
        return `<tr class="qg"><td class="label" colspan="2">${label}</td></tr>
                <tr class="qg-body"><td class="value" colspan="2">${this._renderQuestionGroupHtml(o)}</td></tr>`;
    }

    _buildRowsFor(observations) {
        return observations
            .map(o => o.concept.isQuestionGroup() ? this._buildQuestionGroupRows(o) : this._buildObservationRow(o))
            .join("");
    }

    _buildObservationRowsHtml(observations, form) {
        if (form && _.isFunction(form.sectionWiseOrderedObservations)) {
            const sections = form.sectionWiseOrderedObservations(observations) || [];
            const sectionHtml = sections.map(section => {
                const shareable = this._filterShareableObservations(section.observations);
                if (_.isEmpty(shareable)) return "";
                const heading = section.groupName ? `<h3 class="section-heading">${escapeHtml(this.I18n.t(section.groupName))}</h3>` : "";
                return `${heading}<table class="obs"><tbody>${this._buildRowsFor(shareable)}</tbody></table>`;
            }).filter(x => !_.isEmpty(x));
            return sectionHtml.join("");
        }

        const shareable = this._filterShareableObservations(observations);
        if (_.isEmpty(shareable)) return "";
        return `<table class="obs"><tbody>${this._buildRowsFor(shareable)}</tbody></table>`;
    }

    _buildSubjectHeaderHtml(individual) {
        const name = escapeHtml(individual.getTranslatedNameString ? individual.getTranslatedNameString(this.I18n) : individual.nameString);
        const fullAddress = individual.fullAddress ? escapeHtml(individual.fullAddress(this.I18n)) : "";
        let detailsLine = fullAddress;
        if (individual.subjectType && individual.subjectType.isPerson && individual.subjectType.isPerson()) {
            const genderName = individual.gender?.name;
            const gender = genderName ? escapeHtml(this.I18n.t(genderName)) : "";
            const ageDob = escapeHtml(individual.getAgeAndDateOfBirthDisplay ? individual.getAgeAndDateOfBirthDisplay(this.I18n) : "");
            detailsLine = [gender, ageDob, fullAddress].filter(x => !_.isEmpty(x)).join(", ");
        }
        return `
            <div class="subject-header">
                <div class="subject-name">${name}</div>
                ${detailsLine ? `<div class="subject-details">${detailsLine}</div>` : ""}
            </div>`;
    }

    _buildHtml({individual, formTitle, formMeta, observations, form}) {
        const header = this._buildSubjectHeaderHtml(individual);
        const meta = formMeta ? `<div class="form-meta">${escapeHtml(formMeta)}</div>` : "";
        const title = formTitle ? `<h2 class="form-title">${escapeHtml(formTitle)}</h2>` : "";
        const rows = this._buildObservationRowsHtml(observations, form);
        const footerText = this.getService(PDFGenerationService).getFooterText();

        return `<!doctype html>
                    <html><head><meta charset="utf-8"/>${PDF_STYLES}</head>
                        <body>
                            <table class="page">
                                <tbody>
                                    <tr>
                                        <td>
                                            ${header}
                                            <div class="content">
                                                ${title}
                                                ${meta}
                                                ${rows || `<div class="empty">—</div>`}
                                            </div>
                                        </td>
                                    </tr>
                                </tbody>
                                <tfoot>
                                    <tr>
                                        <td>
                                            <div class="footer-inner">${footerText}</div>
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </body>
                    </html>`;
    }

    _buildFileName(formTitle) {
        return `${snakeCase(formTitle)}_${moment().format("DD_MM_YYYY")}`;
    }

    _shareForm({individual, formTitle, formMeta, observations, form}) {
        const html = this._buildHtml({individual, formTitle, formMeta, observations, form});
        const fileName = this._buildFileName(formTitle);
        return this.getService(PDFGenerationService).shareHtmlAsPdf(html, fileName);
    }

    shareSubjectForm(individual) {
        const registrationForm = this.getService(FormMappingService).findRegistrationForm(individual.subjectType);
        const rawTitle = _.get(registrationForm, "name");
        const formTitle = this.I18n.t(rawTitle);
        const formMeta = `${this.I18n.t("registeredOn")} ${General.toDisplayDate(individual.registrationDate)}`;
        return this._shareForm({
            individual,
            formTitle,
            formMeta,
            observations: individual.observations,
            form: registrationForm,
        });
    }

    shareEnrolmentForm(enrolment, {isExit = false} = {}) {
        const formMappingService = this.getService(FormMappingService);
        const subjectType = enrolment.individual.subjectType;
        const form = isExit
            ? formMappingService.findFormForProgramExit(enrolment.program, subjectType)
            : formMappingService.findFormForProgramEnrolment(enrolment.program, subjectType);
        const rawTitle = _.get(form, "name");
        const formTitle = this.I18n.t(rawTitle);
        const programName = this.I18n.t(_.get(enrolment, "program.displayName", ""));
        const formMeta = isExit
            ? `${programName} · ${this.I18n.t("exitedOn")} ${General.toDisplayDate(enrolment.programExitDateTime)}`
            : `${programName} · ${this.I18n.t("enrolledOn")} ${General.toDisplayDate(enrolment.enrolmentDateTime)}`;
        const observations = isExit
            ? _.defaultTo(enrolment.programExitObservations, [])
            : enrolment.observations;
        return this._shareForm({
            individual: enrolment.individual,
            formTitle,
            formMeta,
            observations,
            form,
        });
    }

    shareEncounterForm(encounter, {formType, cancelFormType} = {}) {
        const isCancelled = !_.isNil(encounter.cancelDateTime);
        const effectiveFormType = isCancelled ? cancelFormType : formType;
        const form = this.getService(FormMappingService).findFormForEncounterType(encounter.encounterType, effectiveFormType, encounter.subjectType);
        const visitName = _.isNil(encounter.name) ? this.I18n.t(encounter.encounterType.displayName) : this.I18n.t(encounter.name);
        const rawTitle = _.get(form, "name");
        const formTitle = this.I18n.t(rawTitle);
        const primaryDate = encounter.encounterDateTime || encounter.cancelDateTime || encounter.earliestVisitDateTime;
        const dateLabel = isCancelled ? this.I18n.t("cancelDate") : this.I18n.t("encounterDate");
        const formMeta = `${visitName} · ${dateLabel}: ${General.toDisplayDate(primaryDate)}`;
        const individual = encounter.individual || _.get(encounter, "programEnrolment.individual");
        return this._shareForm({
            individual,
            formTitle,
            formMeta,
            observations: encounter.getObservations(),
            form,
        });
    }
}

export default FormPDFService;
