import {getJSON, post} from '../../framework/http/requests';
import _ from "lodash";
import moment from "moment";
import BatchRequest from "../../framework/http/BatchRequest";
import ChainedRequests from "../../framework/http/ChainedRequests";

class ConventionalRestClient {
    constructor(settingsService) {
        this.settingsService = settingsService;
    }

    makeParams(paramMap) {
        return _.toPairs(paramMap)
            .map((kv) => kv.join("="))
            .join("&");
    }

    postAllEntities(allEntities, onComplete, onError, popItemFn, currentEntities = _.head(allEntities)) {
        if (_.isEmpty(currentEntities)) return onComplete();
        const serverURL = this.settingsService.getSettings().serverURL;
        const url = (entity) => `${serverURL}/${entity.metaData.resourceName}s`;
        return this.batchPostEntities(url(currentEntities), currentEntities,
            () => this.postAllEntities(_.tail(allEntities), onComplete, onError, popItemFn), onError, popItemFn);
    }

    batchPostEntities(url, entities, onComplete, onError, popItemFn) {
        const chainedRequest = new ChainedRequests();
        entities.entities.map((entity) => chainedRequest.post(url, entity.resource, () =>
            popItemFn(entity.resource.uuid), onError));
        chainedRequest.fire(onComplete, onError);
    }

    getAllForEntity(entityMetadata, persistFn, onComplete, onError) {
        const searchFilter = !_.isEmpty(entityMetadata.resourceSearchFilterURL) ? entityMetadata.resourceSearchFilterURL : "lastModified";
        const serverURL = this.settingsService.getSettings().serverURL;
        const urlParts = [serverURL, entityMetadata.resourceName, "search", searchFilter].join('/');
        const params = (page, size) => this.makeParams({
            catchmentId: this.settingsService.getSettings().catchment,
            lastModifiedDateTime: moment(entityMetadata.syncStatus.loadedSince).add(1, "ms").toISOString(),
            // lastModifiedDateTime: "2010-08-09T13:04:44.364Z",
            size: size,
            page: page
        });
        const processResponse = (resp) => _.get(resp, `_embedded.${entityMetadata.resourceName}`, []);
        const endpoint = (page = 0, size = 100) => `${urlParts}?${params(page, size)}`;
        getJSON(endpoint(), (response) => {
            const chainedRequests = new ChainedRequests();
            const resourceMetadata = response["page"];
            let allResourcesForEntity = processResponse(response);
            _.range(1, resourceMetadata.totalPages, 1)
                .forEach((pageNumber) =>
                    chainedRequests.add(endpoint(pageNumber),
                        (resp) => allResourcesForEntity.push.apply(allResourcesForEntity, processResponse(resp)), onError));

            chainedRequests.fire(() => {
                persistFn(entityMetadata, allResourcesForEntity);
                onComplete();
            }, onError);
        }, onError);
    }

    getAll(entitiesMetadata, persistFn, onComplete, onError, currentEntityMetadata = _.head(entitiesMetadata)) {
        if (_.isEmpty(currentEntityMetadata)) return onComplete();
        return this.getAllForEntity(
            currentEntityMetadata,
            persistFn,
            () => this.getAll(_.tail(entitiesMetadata), persistFn, onComplete, onError),
            onError
        );
    }
}

export default ConventionalRestClient;