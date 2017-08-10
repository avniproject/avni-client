import {getJSON, post} from '../../framework/http/requests';
import _ from "lodash";
import moment from "moment";
import General from "../../utility/General";
import EntityMetaData from "../../models/EntityMetaData"
import BatchRequest from "../../framework/http/BatchRequest";
import EntityQueueService from "../EntityQueueService";

class ConventionalRestClient {
    constructor(settingsService) {
        this.settingsService = settingsService;
    }

    loadData(entityModel, lastUpdatedLocally, pageNumber, allEntityMetaData, executePerResourcesWithSameTimestamp, executeNextResource, resourcesWithSameTimestamp, onError) {
        let urlParts = [];
        urlParts.push(this.settingsService.getSettings().serverURL);
        urlParts.push(entityModel.resourceName);
        urlParts.push("search");
        const resourceSearchFilterURL = !_.isNil(entityModel.resourceSearchFilterURL) ? entityModel.resourceSearchFilterURL : "lastModified";
        urlParts.push(resourceSearchFilterURL);

        let params = [];
        if (entityModel.type === "tx" || entityModel.name === EntityMetaData.addressLevel.name) {
            params.push(`catchmentId=${this.settingsService.getSettings().catchment}`);
        }
        params.push(`lastModifiedDateTime=${moment(lastUpdatedLocally).add(1, "ms").toISOString()}`);
        params.push("size=5");
        params.push(`page=${pageNumber}`);

        const url = `${urlParts.join("/")}?${params.join("&")}`;

        getJSON(url, (response) => {
            const resources = response["_embedded"][`${entityModel.resourceName}`];
            _.forEach(resources, (resource) => {
                General.logDebug('ConventionalRestClient', `Number of resources with same timestamp: ${resourcesWithSameTimestamp.length}`);
                if (resourcesWithSameTimestamp.length === 0)
                    resourcesWithSameTimestamp.push(resource);
                else if (resourcesWithSameTimestamp.length > 0 && resourcesWithSameTimestamp[0]["lastModifiedDateTime"] === resource["lastModifiedDateTime"])
                    resourcesWithSameTimestamp.push(resource);
                else {
                    General.logDebug('ConventionalRestClient', `Executing sync action on: ${resourcesWithSameTimestamp.length} items for resource: ${entityModel.resourceName}`)
                    executePerResourcesWithSameTimestamp(resourcesWithSameTimestamp, entityModel);
                    resourcesWithSameTimestamp = [resource];
                }
            });

            if (ConventionalRestClient.morePagesForThisResource(response)) {
                this.loadData(entityModel, lastUpdatedLocally, pageNumber + 1, allEntityMetaData, executePerResourcesWithSameTimestamp, executeNextResource, resourcesWithSameTimestamp, onError);
            } else if (resourcesWithSameTimestamp.length > 0) {
                // General.logDebug('ConventionalRestClient', `Executing sync action on: ${resourcesWithSameTimestamp.length} items for resource: ${entityModel.resourceName}`);
                executePerResourcesWithSameTimestamp(resourcesWithSameTimestamp, entityModel);
                executeNextResource(allEntityMetaData);
            } else {
                executeNextResource(allEntityMetaData);
            }
        }, onError);
    }

    static morePagesForThisResource(response) {
        return response["page"]["number"] < (response["page"]["totalPages"] - 1);
    }

    postAllEntities(allEntities, onComplete, onError, popItemFn, currentEntities = _.head(allEntities)) {
        if (_.isEmpty(currentEntities)) return onComplete();
        const serverURL = this.settingsService.getSettings().serverURL;
        const url = (entity) => `${serverURL}/${entity.metaData.resourceName}s`;
        return this.batchPostEntities(url(currentEntities), currentEntities,
            () => this.postAllEntities(allEntities.slice(1, allEntities.length), onComplete, onError, popItemFn), onError, popItemFn);
    }

    batchPostEntities(url, entities, onComplete, onError, popItemFn) {
        const batchRequest = new BatchRequest();
        entities.entities.map((entity) => batchRequest.post(url, entity.resource, () =>
            popItemFn(entity.resource.uuid)));
        batchRequest.fire(onComplete, onError);
    }
}

export default ConventionalRestClient;