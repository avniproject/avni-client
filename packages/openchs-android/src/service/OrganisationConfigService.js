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

    getOTPLength() {
        return this.getSettings().otpLength || 0;
    }

    hasHomeScreen() {
        return this.getHomeScreen() !== undefined;
    }

    getHomeScreen() {
        return _.find(this.getExtensions(), extension => extension.extensionScope.scopeType === 'Field App Home Screen');
    }

    getExtensions() {
        return this.getSettings().extensions || [];
    }

}

export default OrganisationConfigService;
