import {getJSON, post} from '../../framework/http/requests';
import _ from "lodash";
import moment from "moment";

class ConventionalRestClient {
    constructor(settingsService) {
        this.settingsService = settingsService;
    }

    loadData(entityModel, lastUpdatedLocally, pageNumber, allEntityMetaData, executePerResourcesWithSameTimestamp, executeNextResource, resourcesWithSameTimestamp, onError) {
        const url = `${this.settingsService.getServerURL()}/${entityModel.resourceName}/search/lastModified?lastModifiedDateTime=${moment(lastUpdatedLocally).add(1, "ms").toISOString()}&size=5&page=${pageNumber}&sort=lastModifiedDateTime,asc`;
        getJSON(url, (response) => {
            const resources = response["_embedded"][`${entityModel.resourceName}`];
            _.forEach(resources, (resource) => {
                console.log(`Number of resources with same timestamp: ${resourcesWithSameTimestamp.length}`);
                if (resourcesWithSameTimestamp.length === 0)
                    resourcesWithSameTimestamp.push(resource);
                else if (resourcesWithSameTimestamp.length > 0 && resourcesWithSameTimestamp[0]["lastModifiedDateTime"] === resource["lastModifiedDateTime"])
                    resourcesWithSameTimestamp.push(resource);
                else {
                    console.log(`Executing sync action on: ${resourcesWithSameTimestamp.length} items for resource: ${entityModel.resourceName}`);
                    executePerResourcesWithSameTimestamp(resourcesWithSameTimestamp, entityModel);
                    resourcesWithSameTimestamp = [resource];
                }
            });

            if (this.morePagesForThisResource(response)) {
                this.loadData(entityModel, lastUpdatedLocally, pageNumber + 1, allEntityMetaData, executePerResourcesWithSameTimestamp, executeNextResource, resourcesWithSameTimestamp, onError);
            } else if (resourcesWithSameTimestamp.length > 0) {
                console.log(`Executing sync action on: ${resourcesWithSameTimestamp.length} items for resource: ${entityModel.resourceName}`);
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
            console.log(`No items in the EntityQueue`);
            onComplete();
            return;
        }

        const url = `${this.settingsService.getServerURL()}/${nextItem.metaData.resourceName}s`;
        console.log("postEntity");
        console.log(JSON.stringify(nextItem.resource));
        post(url, nextItem.resource, (response) => {
            if (!_.isNil(response.ok) && !response.ok) {
                console.log(response);
                onError();
            } else {
                onCompleteCurrentItem();
                this.postEntity(getNextItem, onCompleteCurrentItem, onComplete, onError);
            }
        }, onError);
    }
}

export default ConventionalRestClient;