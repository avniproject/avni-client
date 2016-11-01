import {get} from '../../framework/http/requests';
import SettingsService from "../SettingsService";
import _ from "lodash";

class ConventionalRestClient {
    loadData(entityModel, last_updated_locally, page_number, execute_per_resource) {
        const url = `${this.getService(SettingsService).getServerURL()}/${entityModel.resourceName}/search/lastModified?lastModifiedDateTime=${last_updated_locally}&size=5&page=${page_number}&sort=lastModifiedDateTime,desc`;
        get(url, (response) => {
            var resources = response["_embedded"][`${entityModel.resourceName}`];
            _.forEach(resources, (resource) => execute_per_resource(resource, entityModel));
            if (response["page"]["number"] < (response["page"]["totalPages"] - 1)) {
                this.loadData(entityModel.resourceName, last_updated_locally, page_number + 1, execute_per_resource);
            }
        });
    }
}

export default ConventionalRestClient;