import {OrganisationConfig} from 'openchs-models';
import General from "../../src/utility/General";

class TestOrganisationConfigFactory {
    static createWithDefaults({worklistUpdationRule = "", settings = "{\"languages\": [\"en\"]}"}) {
        const organisationConfig = new OrganisationConfig();
        organisationConfig.uuid = General.randomUUID();
        organisationConfig.settings = settings;
        organisationConfig.worklistUpdationRule = worklistUpdationRule;
        return organisationConfig;
    }
}

export default TestOrganisationConfigFactory;
