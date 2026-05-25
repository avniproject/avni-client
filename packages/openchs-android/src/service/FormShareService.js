import BaseService from "./BaseService";
import Service from "../framework/bean/Service";
import _ from "lodash";
import moment from "moment";
import Share from "react-native-share";
import {Observation} from "avni-models";
import ConceptService from "./ConceptService";
import AddressLevelService from "./AddressLevelService";
import IndividualService from "./IndividualService";
import EncounterService from "./EncounterService";
import FormMappingService from "./FormMappingService";
import MessageService from "./MessageService";
import UserInfoService from "./UserInfoService";
import RuleEvaluationService from "./RuleEvaluationService";
import FormPDFService from "./FormPDFService";
import FormShareTemplateService from "./FormShareTemplateService";
import PDFGenerationService from "./PDFGenerationService";
import General from "../utility/General";
import ErrorUtil from "../framework/errorHandling/ErrorUtil";

function snakeCase(str) {
    const out = _.snakeCase(_.deburr(String(str || "")));
    return _.isEmpty(out) ? "form" : out;
}

function renderMustache(template, data) {
    if (_.isEmpty(template)) return "";
    return String(template).replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_match, key) => {
        const value = _.get(data, key.trim());
        return _.isNil(value) ? "" : String(value);
    });
}

@Service("formShareService")
class FormShareService extends BaseService {
    constructor(db, beanStore) {
        super(db, beanStore);
    }

    init() {
        this.I18n = this.getService(MessageService).getI18n();
    }

    // ---------- Entry points ----------

    shareSubjectForm(individual, format) {
        const form = this.getService(FormMappingService).findRegistrationForm(individual.subjectType);
        const rawTitle = _.get(form, "name");
        const formTitle = this.I18n.t(rawTitle);
        const formMeta = `${this.I18n.t("registeredOn")} ${General.toDisplayDate(individual.registrationDate)}`;
        const ruleOut = this.getService(RuleEvaluationService).runShareRule(form, individual, "Individual");
        return this._dispatch(format, {
            form, individual, entity: individual,
            observations: individual.observations,
            formTitle, formMeta, ruleOut,
        });
    }

    shareEnrolmentForm(enrolment, {isExit = false} = {}, format) {
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
        const ruleOut = this.getService(RuleEvaluationService).runShareRule(form, enrolment, "ProgramEnrolment");
        return this._dispatch(format, {
            form, individual: enrolment.individual, entity: enrolment,
            observations, formTitle, formMeta, ruleOut,
            _passthrough: {isExit},
        });
    }

    shareEncounterForm(encounter, {formType, cancelFormType} = {}, format) {
        const isCancelled = !_.isNil(encounter.cancelDateTime);
        const effectiveFormType = isCancelled ? cancelFormType : formType;
        const form = this.getService(FormMappingService).findFormForEncounterType(
            encounter.encounterType, effectiveFormType, encounter.subjectType);
        const visitName = _.isNil(encounter.name) ? this.I18n.t(encounter.encounterType.displayName) : this.I18n.t(encounter.name);
        const rawTitle = _.get(form, "name");
        const formTitle = this.I18n.t(rawTitle);
        const primaryDate = encounter.encounterDateTime || encounter.cancelDateTime || encounter.earliestVisitDateTime;
        const dateLabel = isCancelled ? this.I18n.t("cancelDate") : this.I18n.t("encounterDate");
        const formMeta = `${visitName} · ${dateLabel}: ${General.toDisplayDate(primaryDate)}`;
        const individual = encounter.individual || _.get(encounter, "programEnrolment.individual");
        const entityName = encounter.programEnrolment ? "ProgramEncounter" : "Encounter";
        const ruleOut = this.getService(RuleEvaluationService).runShareRule(form, encounter, entityName);
        return this._dispatch(format, {
            form, individual, entity: encounter,
            observations: encounter.getObservations(),
            formTitle, formMeta, ruleOut,
            _passthrough: {formType, cancelFormType},
        });
    }

    // ---------- Dispatch ----------

    _dispatch(format, ctx) {
        return format === "text" ? this._shareText(ctx) : this._sharePdf(ctx);
    }

    // ---------- PDF branch ----------

    async _sharePdf(ctx) {
        const {form, ruleOut, formTitle} = ctx;
        const hasCustomPdf = _.isPlainObject(ruleOut?.data) && form && form.hasShareTemplate && form.hasShareTemplate();
        if (hasCustomPdf) {
            try {
                const templateHtml = await this.getService(FormShareTemplateService).readHtmlTemplate(form);
                if (!_.isEmpty(templateHtml)) {
                    // Consistent with custom cards: the template owns the full HTML output.
                    const html = renderMustache(templateHtml, ruleOut.data);
                    const fileName = `${snakeCase(formTitle)}_${moment().format("DD_MM_YYYY")}`;
                    return await this.getService(PDFGenerationService).shareHtmlAsPdf(html, fileName);
                }
                General.logDebug("FormShareService", `Share template ${form.shareTemplateS3Key} fetched but empty; falling back to default PDF`);
            } catch (e) {
                General.logError("FormShareService._sharePdf", e);
                ErrorUtil.notifyBugsnag(e, "FormShareService");
                // Fall through to default
            }
        }
        // Fall back to default by delegating to FormPDFService entry points.
        return this._defaultPdfShare(ctx);
    }

    _defaultPdfShare({entity, _passthrough}) {
        const pdf = this.getService(FormPDFService);
        if (entity && _.isFunction(entity.getObservations) && entity.encounterType) {
            return pdf.shareEncounterForm(entity, _passthrough);
        }
        if (entity && entity.program) {
            return pdf.shareEnrolmentForm(entity, _passthrough);
        }
        return pdf.shareSubjectForm(entity);
    }

    // ---------- Text branch ----------

    _shareText(ctx) {
        const {ruleOut} = ctx;
        const text = (_.isString(ruleOut?.text) && !_.isEmpty(ruleOut.text))
            ? ruleOut.text
            : this._buildDefaultText(ctx);
        return Share.open({
            message: text,
            type: "text/plain",
            failOnCancel: false,
        }).catch((err) => {
            if (err?.message === "User did not share" || err?.error === "User did not share") return;
            General.logError("FormShareService._shareText", err);
            ErrorUtil.notifyBugsnag(err, "FormShareService");
        });
    }

    _buildDefaultText({form, individual, observations, formTitle, formMeta}) {
        const lines = [];
        lines.push(this._subjectHeaderText(individual));
        lines.push("");
        if (!_.isEmpty(formTitle)) lines.push(formTitle);
        if (!_.isEmpty(formMeta)) lines.push(formMeta);
        lines.push("");
        const body = this._observationsText(observations, form);
        if (!_.isEmpty(body)) lines.push(body);
        lines.push("");
        lines.push("---");
        lines.push(this._footerText());
        return lines.join("\n");
    }

    _subjectHeaderText(individual) {
        if (!individual) return "";
        const name = individual.getTranslatedNameString ? individual.getTranslatedNameString(this.I18n) : individual.nameString;
        const fullAddress = individual.fullAddress ? individual.fullAddress(this.I18n) : "";
        const parts = [name];
        if (individual.subjectType && individual.subjectType.isPerson && individual.subjectType.isPerson()) {
            const genderName = _.get(individual, "gender.name");
            if (genderName) parts.push(this.I18n.t(genderName));
            if (individual.getAgeAndDateOfBirthDisplay) {
                const ageDob = individual.getAgeAndDateOfBirthDisplay(this.I18n);
                if (!_.isEmpty(ageDob)) parts.push(ageDob);
            }
        }
        if (!_.isEmpty(fullAddress)) parts.push(fullAddress);
        return parts.filter(p => !_.isEmpty(p)).join(", ");
    }

    _footerText() {
        const userInfo = this.getService(UserInfoService).getUserInfo();
        const username = _.get(userInfo, "username") || _.get(userInfo, "name") || "";
        const timestamp = moment().format("DD-MM-YYYY HH:mm");
        return `${this.I18n.t("generatedByAvni")} · ${username} · ${timestamp}`;
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
            General.logError("FormShareService", `Failed to render observation for concept ${observation?.concept?.name}: ${e.message}`);
            ErrorUtil.notifyBugsnag(e, "FormShareService");
            return "";
        }
    }

    _renderObservationLines(observations, indent) {
        const pad = indent || "";
        return this._filterShareableObservations(observations).map(o => {
            const label = this.I18n.t(o.concept.name);
            if (o.concept.isQuestionGroup()) {
                const header = `${pad}${label}:`;
                const valueWrapper = o.getValueWrapper();
                const isRepeatable = valueWrapper && _.isFunction(valueWrapper.isRepeatable) && valueWrapper.isRepeatable();
                if (isRepeatable) {
                    const repetitions = valueWrapper.getValue() || [];
                    const blocks = repetitions.map(qg => this._renderObservationLines(qg.getValue ? qg.getValue() : [], pad + "  "));
                    return [header, ...blocks].filter(s => !_.isEmpty(s)).join("\n");
                }
                const inner = this._renderObservationLines(valueWrapper ? valueWrapper.getValue() : [], pad + "  ");
                return _.isEmpty(inner) ? header : `${header}\n${inner}`;
            }
            const value = this._getObservationDisplayText(o) || "—";
            return `${pad}${label}: ${value}`;
        }).filter(s => !_.isEmpty(s)).join("\n");
    }

    _observationsText(observations, form) {
        if (form && _.isFunction(form.sectionWiseOrderedObservations)) {
            const sections = form.sectionWiseOrderedObservations(observations) || [];
            const blocks = sections.map(section => {
                const shareable = this._filterShareableObservations(section.observations);
                if (_.isEmpty(shareable)) return "";
                const heading = section.groupName ? `— ${this.I18n.t(section.groupName)} —` : "";
                const body = this._renderObservationLines(shareable);
                return [heading, body].filter(s => !_.isEmpty(s)).join("\n");
            }).filter(b => !_.isEmpty(b));
            return blocks.join("\n\n");
        }
        return this._renderObservationLines(observations);
    }
}

export default FormShareService;
