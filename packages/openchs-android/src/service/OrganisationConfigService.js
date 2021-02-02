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

}

export default OrganisationConfigService;
