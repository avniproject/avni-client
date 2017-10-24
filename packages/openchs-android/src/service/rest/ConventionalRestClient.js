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

    authenticate() {
        const settings = this.settingsService.getSettings();
        return post(`${settings.serverURL}/login`, {username: settings.userId, password: settings.password})
            .then((response) => response.json())
            .then((response) => {
                    const updatedSettings = settings.clone();
                    updatedSettings.authToken = response.authToken;
                    this.settingsService.saveOrUpdate(updatedSettings);
            });
    }

    postAllEntities(allEntities, onCompleteOfIndividualPost) {
        let settings = this.settingsService.getSettings();
        const serverURL = settings.serverURL;
        const url = (entity) => `${serverURL}/${entity.metaData.resourceName}s`;
        return _.reduce(allEntities,
            (acc, entities) => acc.then(this.chainPostEntities(url(entities), entities, settings.authToken, onCompleteOfIndividualPost)),
            Promise.resolve());
    }

    chainPostEntities(url, entities, authToken, onComplete) {
        const chainedRequest = new ChainedRequests();
        entities.entities.map((entity) => chainedRequest.push(chainedRequest.post(url, entity.resource, authToken, onComplete(entity.resource.uuid))));
        return chainedRequest.fire();
    }

    getAllForEntity(entityMetadata, onGetOfAnEntity) {
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
        return getJSON(endpoint(), settings.authToken).then((response) => {
            const chainedRequests = new ChainedRequests();
            const resourceMetadata = response["page"];
            let allResourcesForEntity = processResponse(response);
            _.range(1, resourceMetadata.totalPages, 1)
                .forEach((pageNumber) => chainedRequests.push(chainedRequests.get(
                    endpoint(pageNumber), settings.authToken,
                    (resp) => allResourcesForEntity.push.apply(allResourcesForEntity, processResponse(resp)))));

            return chainedRequests.fire().then(() => onGetOfAnEntity(entityMetadata, allResourcesForEntity));
        });
    }

    getAll(entitiesMetadata, onGetOfAnEntity) {
        return _.reduce(entitiesMetadata,
            (acc, entityMetadata) => this.getAllForEntity(entityMetadata, onGetOfAnEntity),
            Promise.resolve());
    }
}

export default ConventionalRestClient;