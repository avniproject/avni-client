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

    getUserInfo() {
        let settings = this.settingsService.getSettings();
        const serverURL = settings.serverURL;
        return getJSON(`${serverURL}/me`, this.token);
    }

    postAllEntities(allEntities, onCompleteOfIndividualPost, onComplete) {
        let settings = this.settingsService.getSettings();
        const serverURL = settings.serverURL;
        const url = entity =>
            _.isNil(entity.metaData.resourceUrl)
                ? `${serverURL}/${entity.metaData.resourceName}s`
                : `${serverURL}/${entity.metaData.resourceUrl}`;
        return _.reduce(allEntities,
            (acc, entities) => {
                return acc
                    .then(this.chainPostEntities(url(entities), entities, this.token, onCompleteOfIndividualPost))
                    .then(() => onComplete(entities.metaData.entityName + ".PUSH"));
            },
            Promise.resolve());
    }

    chainPostEntities(url, entities, authToken, onComplete) {
        return () => {
            const chainedRequest = new ChainedRequests();
            entities.entities.map((entity) => {
                return chainedRequest.push(chainedRequest.post(url, entity.resource, authToken, onComplete(entities.metaData, entity.resource.uuid)))
            });
            return chainedRequest.fire();
        }
    }

    getAllForEntity(entityMetadata, onGetOfAnEntity, onGetOfFirstPage) {
        const token = this.token;
        const searchFilter = !_.isEmpty(entityMetadata.resourceSearchFilterURL) ? `search/${entityMetadata.resourceSearchFilterURL}` : '';
        let settings = this.settingsService.getSettings();
        const resourceEndpoint = [
            settings.serverURL,
            _.isNil(entityMetadata.apiVersion) ? "" : entityMetadata.apiVersion,
            _.isNil(entityMetadata.resourceUrl) ? entityMetadata.resourceName : entityMetadata.resourceUrl,
            searchFilter
        ]
            .filter(p => !_.isEmpty(p))
            .join("/");
        const loadedSince = entityMetadata.syncStatus.loadedSince;
        const params = (page, size) => this.makeParams({
            lastModifiedDateTime: moment(loadedSince).toISOString(),
            size: size,
            page: page
        });
        const processResponse = (resp) => onGetOfAnEntity(entityMetadata, _.get(resp, `_embedded.${entityMetadata.resourceName}`, []));
        const endpoint = (page = 0, size = settings.pageSize) => `${resourceEndpoint}?${params(page, size)}`;
        return getJSON(endpoint(), token).then((response) => {
            //first page
            const page = response["page"];
            processResponse(response);
            onGetOfFirstPage(entityMetadata.entityName, page);

            //rest pages
            const chainedRequests = new ChainedRequests();
            _.range(1, page.totalPages, 1)
                .forEach((pageNumber) => chainedRequests.push(chainedRequests.get(
                    endpoint(pageNumber), token,
                    (resp) => processResponse(resp))));

            return chainedRequests.fire();
        });
    }

    getAll(entitiesMetadataWithSyncStatus, onGetOfAnEntity, onGetOfFirstPage, afterGetOfAllEntities) {
        return _.reduce(entitiesMetadataWithSyncStatus,
            (acc, entityMetadataWithSyncStatus) => {
                return acc
                    .then(() => this.getAllForEntity(entityMetadataWithSyncStatus, onGetOfAnEntity, onGetOfFirstPage))
                    .then(() => afterGetOfAllEntities(entityMetadataWithSyncStatus.entityName + ".PULL"));
            },
            Promise.resolve());
    }

    setToken(idToken) {
        this.token = idToken;
    }
}

export default ConventionalRestClient;
