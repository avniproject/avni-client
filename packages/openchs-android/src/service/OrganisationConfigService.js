import Service from "../framework/bean/Service";
import BaseService from "./BaseService";
import {OrganisationConfig} from "avni-models";
import _ from "lodash";

@Service("organisationConfigService")
class OrganisationConfigService extends BaseService {
    constructor(db, context) {
        super(db, context);
    }

    getSchema() {
        return OrganisationConfig.schema.name;
    }

    getSettings() {
        const orgConfig = this.findOnly(OrganisationConfig.schema.name);
        return _.isEmpty(orgConfig) ? {} : orgConfig.getSettings();
    }

    getCustomRegistrationLocations() {
        return this.getSettings() && this.getSettings().customRegistrationLocations || [];
    }

    getCustomRegistrationLocationsForSubjectType(subjectTypeUUID) {
        return _.find(this.getCustomRegistrationLocations(), crl => crl.subjectTypeUUID === subjectTypeUUID)
    }

    isSaveDraftOn() {
        return !!this.getSettings().saveDrafts;
    }

    isDbEncryptionEnabled() {
        return !!this.getSettings().enableMobileAppDbEncryption;
    }

    getOTPLength() {
        return this.getSettings().otpLength || 4;
    }

    hasHomeScreen() {
        return !_.isNil(this.getHomeScreen());
    }

    getHomeScreen() {
        return _.find(this.getExtensions(), extension => extension.extensionScope.scopeType === 'Field App Home Screen');
    }

    getExtensions() {
        return this.getSettings().extensions || [];
    }

    isSummaryButtonSetup() {
        return !!this.getSettings().showSummaryButton;
    }

    getCustomSearchResultConceptsForSubjectType(subjectType) {
        if (!this._searchResultConceptsCache) this._searchResultConceptsCache = new Map();
        if (this._searchResultConceptsCache.has(subjectType.uuid)) {
            return this._searchResultConceptsCache.get(subjectType.uuid);
        }
        const searchResultField = _.find(this.getSettings().searchResultFields, ({subjectTypeUUID}) => subjectTypeUUID === subjectType.uuid);
        const result = _.sortBy(_.get(searchResultField, 'searchResultConcepts', []), 'displayOrder');
        this._searchResultConceptsCache.set(subjectType.uuid, result);
        return result;
    }

    getMaxAddressDisplayInlineCount() {
        return this.getSettings().maxAddressDisplayInlineCount || 30;
    }

    hasHideTotalForProgram = () => {
        return this.getSettings().hideTotalForProgram === undefined || this.getSettings().hideTotalForProgram;
    }

    hasShowDueChecklistOnDashboard = () => {
        return !!this.getSettings().showDueChecklistOnDashboard;
    }

    isGuideUserToRegisterButtonOn() {
        return !!this.getSettings().guideUserToRegisterButton;
    }

    // Camera usability enhancement (Phase 3) — originally designed as a server-controlled
    // rollout flag (enableNativeCameraCapture in the synced OrganisationConfig settings blob,
    // same mechanism as isSaveDraftOn()/isSummaryButtonSetup() above), gated so that only the
    // tanuh flavour (where NativeModules.CameraModule actually exists) would ever read it.
    // CONFIRMED (2026-08-18): that server-side flag will not be added — TANUH has decided native
    // camera capture is unconditionally on for this flavour. This is intentionally hardcoded
    // `true`, not a temporary test override; there is no per-organisation opt-out.
    isNativeCameraEnabled() {
        return true;
    }
}

export default OrganisationConfigService;
