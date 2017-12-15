import {getJSON, post} from '../../framework/http/requests';
import _ from "lodash";
import moment from "moment";
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

    getUserInfo(catchmentId, persistFn) {
        let settings = this.settingsService.getSettings();
        const serverURL = settings.serverURL;
        return getJSON(`${serverURL}/userInfo?catchmentId=${catchmentId}`, this.token).then(persistFn);
    }

    postAllEntities(allEntities, onCompleteOfIndividualPost) {
        let settings = this.settingsService.getSettings();
        const serverURL = settings.serverURL;
        const url = (entity) => `${serverURL}/${entity.metaData.resourceName}s`;
        return _.reduce(allEntities,
            (acc, entities) => acc.then(this.chainPostEntities(url(entities), entities, this.token, onCompleteOfIndividualPost)),
            Promise.resolve());
    }

    chainPostEntities(url, entities, authToken, onComplete) {
        return () => {
            const chainedRequest = new ChainedRequests();
            entities.entities.map((entity) => chainedRequest.push(chainedRequest.post(url, entity.resource, authToken, onComplete(entity.resource.uuid))));
            return chainedRequest.fire();
        }
    }

    getAllForEntity(entityMetadata, onGetOfAnEntity) {
        const token = this.token;
        const searchFilter = !_.isEmpty(entityMetadata.resourceSearchFilterURL) ? entityMetadata.resourceSearchFilterURL : "lastModified";
        let settings = this.settingsService.getSettings();
        const urlParts = [settings.serverURL, entityMetadata.resourceName, "search", searchFilter].join('/');
        const params = (page, size) => this.makeParams({
            catchmentId: settings.catchment,
            lastModifiedDateTime: moment(entityMetadata.syncStatus.loadedSince).add(1, "ms").toISOString(),
            size: size,
            page: page
        });
        const processResponse = (resp) => _.get(resp, `_embedded.${entityMetadata.resourceName}`, []);
        const endpoint = (page = 0, size = 100) => `${urlParts}?${params(page, size)}`;
        return getJSON(endpoint(), token).then((response) => {
            const chainedRequests = new ChainedRequests();
            const resourceMetadata = response["page"];
            let allResourcesForEntity = processResponse(response);
            _.range(1, resourceMetadata.totalPages, 1)
                .forEach((pageNumber) => chainedRequests.push(chainedRequests.get(
                    endpoint(pageNumber), token,
                    (resp) => allResourcesForEntity.push.apply(allResourcesForEntity, processResponse(resp)))));

            return chainedRequests.fire().then(() => onGetOfAnEntity(entityMetadata, allResourcesForEntity));
        });
    }

    getAll(entitiesMetadataWithSyncStatus, onGetOfAnEntity) {
        return _.reduce(entitiesMetadataWithSyncStatus,
            (acc, entityMetadataWithSyncStatus) => acc.then(() => this.getAllForEntity(entityMetadataWithSyncStatus, onGetOfAnEntity)),
            Promise.resolve());
    }

    setToken(idToken) {
        this.token = idToken;
    }
}

export default ConventionalRestClient;