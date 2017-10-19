import {getJSON} from '../../framework/http/requests';
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

    postAllEntities(allEntities, onCompleteOfIndividualPost, currentEntities = _.head(allEntities)) {
        if (!currentEntities) return Promise.resolve();

        const serverURL = this.settingsService.getSettings().serverURL;
        const url = (entity) => `${serverURL}/${entity.metaData.resourceName}s`;
        return this.chainPostEntities(url(currentEntities), currentEntities, onCompleteOfIndividualPost)
            .then(() => this.postAllEntities(_.tail(allEntities), onCompleteOfIndividualPost));
    }

    chainPostEntities(url, entities, onComplete) {
        const chainedRequest = new ChainedRequests();
        entities.entities.map(
            (entity) => chainedRequest.push(chainedRequest.post(url, entity.resource, onComplete(entity.resource.uuid))));

        return chainedRequest.fire();
    }

    getAllForEntity(entityMetadata, onGetOfAnEntity) {
        const searchFilter = !_.isEmpty(entityMetadata.resourceSearchFilterURL) ? entityMetadata.resourceSearchFilterURL : "lastModified";
        const serverURL = this.settingsService.getSettings().serverURL;
        const urlParts = [serverURL, entityMetadata.resourceName, "search", searchFilter].join('/');
        const params = (page, size) => this.makeParams({
            catchmentId: this.settingsService.getSettings().catchment,
            lastModifiedDateTime: moment(entityMetadata.syncStatus.loadedSince).add(1, "ms").toISOString(),
            size: size,
            page: page
        });
        const processResponse = (resp) => _.get(resp, `_embedded.${entityMetadata.resourceName}`, []);
        const endpoint = (page = 0, size = 100) => `${urlParts}?${params(page, size)}`;
        return getJSON(endpoint()).then((response) => {
            const chainedRequests = new ChainedRequests();
            const resourceMetadata = response["page"];
            let allResourcesForEntity = processResponse(response);
            _.range(1, resourceMetadata.totalPages, 1)
                .forEach((pageNumber) => chainedRequests.push(chainedRequests.get(
                    endpoint(pageNumber),
                    (resp) => allResourcesForEntity.push.apply(allResourcesForEntity, processResponse(resp)))));

            return chainedRequests.fire().then(() => onGetOfAnEntity(entityMetadata, allResourcesForEntity));
        });
    }

    getAll(entitiesMetadata, onGetOfAnEntity, currentEntityMetadata = _.head(entitiesMetadata)) {
        if (!currentEntityMetadata) return Promise.resolve();

        return this.getAllForEntity(currentEntityMetadata, onGetOfAnEntity)
            .then(() => this.getAll(_.tail(entitiesMetadata), onGetOfAnEntity)
        );
    }
}

export default ConventionalRestClient;