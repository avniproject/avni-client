import {getJSON, post} from '../../framework/http/requests';
import _ from "lodash";
import moment from "moment";
import General from "../../utility/General";

class ConventionalRestClient {
    constructor(settingsService) {
        this.settingsService = settingsService;
    }

    loadData(entityModel, lastUpdatedLocally, pageNumber, allEntityMetaData, executePerResourcesWithSameTimestamp, executeNextResource, resourcesWithSameTimestamp, onError) {
        let urlParts = [];
        urlParts.push(this.settingsService.getServerURL());
        urlParts.push(entityModel.resourceName);
        urlParts.push("search");
        const resourceSearchFilterURL = entityModel.type === "tx"? entityModel.resourceSearchFilterURL : "lastModified";
        urlParts.push(resourceSearchFilterURL);

        let params = [];
        if(entityModel.type === "tx"){
            params.push(`catchmentId=${this.settingsService.getCatchment()}`);
        }
        params.push(`lastModifiedDateTime=${moment(lastUpdatedLocally).add(1, "ms").toISOString()}`);
        params.push("size=5");
        params.push(`page=${pageNumber}`);
        params.push("sort=lastModifiedDateTime,asc");

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

            if (this.morePagesForThisResource(response)) {
                this.loadData(entityModel, lastUpdatedLocally, pageNumber + 1, allEntityMetaData, executePerResourcesWithSameTimestamp, executeNextResource, resourcesWithSameTimestamp, onError);
            } else if (resourcesWithSameTimestamp.length > 0) {
                General.logDebug('ConventionalRestClient', `Executing sync action on: ${resourcesWithSameTimestamp.length} items for resource: ${entityModel.resourceName}`);
                executePerResourcesWithSameTimestamp(resourcesWithSameTimestamp, entityModel);
                executeNextResource(allEntityMetaData);
            } else {
                executeNextResource(allEntityMetaData);
            }
        }, onError);
    }

    morePagesForThisResource(response) {
        return response["page"]["number"] < (response["page"]["totalPages"] - 1);
    }

    postEntity(getNextItem, onCompleteCurrentItem, onComplete, onError) {
        const nextItem = getNextItem();
        if (_.isNil(nextItem)) {
            General.logInfo('ConventionalRestClient', `No items in the EntityQueue`);
            onComplete();
            return;
        }

        const url = `${this.settingsService.getServerURL()}/${nextItem.metaData.resourceName}s`;
        post(url, nextItem.resource, (response) => {
            if (!_.isNil(response.ok) && !response.ok) {
                General.logDebug('ConventionalRestClient', response);
                onError();
            } else {
                onCompleteCurrentItem();
                this.postEntity(getNextItem, onCompleteCurrentItem, onComplete, onError);
            }
        }, onError);
    }
}

export default ConventionalRestClient;