import Service from "../framework/bean/Service";
import BaseService from "./BaseService";
import OrganisationConfigService from "./OrganisationConfigService";

/**
 * Centralized service for draft-related configuration decisions.
 * Provides consistent logic across all entity types (Subject, Encounter, Enrolment, ProgramEncounter).
 */
@Service("draftConfigService")
class DraftConfigService extends BaseService {

    constructor(db, context) {
        super(db, context);
    }

    /**
     * Core config check - is draft saving enabled for this organization?
     * Returns false if config is missing or undefined (safe default).
     * @returns {boolean}
     */
    isDraftEnabled() {
        return this.getService(OrganisationConfigService).isSaveDraftOn();
    }

    /**
     * Determines if draft should be saved during form navigation (onNext/onPrevious).
     *
     * Logic:
     * - If editing an existing draft, always continue saving (to preserve user's work)
     * - If it's a new/first flow, only save if org config has drafts enabled
     *
     * @param {boolean} isFirstFlow - true if new entity or not editing existing saved entity
     * @param {boolean} isExistingDraft - true if we loaded from an existing draft
     * @returns {boolean}
     */
    shouldSaveDraft(isFirstFlow, isExistingDraft) {
        return isExistingDraft || (isFirstFlow && this.isDraftEnabled());
    }

    /**
     * Determines if draft data should be loaded when opening a form.
     * Only loads drafts if the organization has draft saving enabled.
     * @returns {boolean}
     */
    shouldLoadDraft() {
        return this.isDraftEnabled();
    }

    /**
     * Determines if draft sections should be displayed in dashboard/UI.
     * Only displays drafts if the organization has draft saving enabled.
     * @returns {boolean}
     */
    shouldDisplayDrafts() {
        return this.isDraftEnabled();
    }
}

export default DraftConfigService;
