import {getJSON} from '../../framework/http/requests';
import _ from "lodash";
import moment from "moment";
import ChainedRequests from "../../framework/http/ChainedRequests";

class ConventionalRestClient {
    constructor(settingsService, privilegeService) {
        this.settingsService = settingsService;
        this.privilegeService = privilegeService;
    }

    makeParams(paramMap) {
        return _.toPairs(paramMap)
            .map((kv) => kv.join("="))
            .join("&");
    }

    getUserInfo() {
        let settings = this.settingsService.getSettings();
        const serverURL = settings.serverURL;
        return getJSON(`${serverURL}/me`);
    }

    postAllEntities(allEntities, onCompleteOfIndividualPost, onComplete) {
        let settings = this.settingsService.getSettings();
        const serverURL = settings.serverURL;
        const ESResources = ['entityApprovalStatus'];
        const getResourceName = (resourceName) => _.includes(ESResources, resourceName) ? `${resourceName}es` : `${resourceName}s`;
        const url = entity =>
            _.isNil(entity.metaData.resourceUrl)
                ? `${serverURL}/${getResourceName(entity.metaData.resourceName)}`
                : `${serverURL}/${entity.metaData.resourceUrl}`;
        return _.reduce(allEntities,
            (acc, entities) => {
                return acc
                    .then(this.chainPostEntities(url(entities), entities, onCompleteOfIndividualPost))
                    .then(() => onComplete(entities.metaData.entityName, 0));
            },
            Promise.resolve());
    }

    chainPostEntities(url, entities, onComplete) {
        return () => {
            const chainedRequest = new ChainedRequests();
            entities.entities.map((entity) => {
                return chainedRequest.push(chainedRequest.post(url, entity.resource, onComplete(entities.metaData, entity.resource.uuid)))
            });
            return chainedRequest.fire();
        }
    }

    getAllForEntity(entityMetadata, onGetOfAnEntity, onGetOfFirstPage, afterGetOfEntity) {
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
        const {loadedSince, entityTypeUuid} = entityMetadata.syncStatus;
        const {privilegeParam} = entityMetadata;
        if (privilegeParam) {
            const params = (page, size) => this.makeParams({
                [privilegeParam]: entityTypeUuid,
                lastModifiedDateTime: moment(loadedSince).toISOString(),
                size: size,
                page: page
            });
            return this.fireRequest(onGetOfAnEntity, entityMetadata, afterGetOfEntity, settings, resourceEndpoint, params, onGetOfFirstPage);
        } else {
            const params = (page, size) => this.makeParams({
                lastModifiedDateTime: moment(loadedSince).toISOString(),
                size: size,
                page: page
            });
            return this.fireRequest(onGetOfAnEntity, entityMetadata, afterGetOfEntity, settings, resourceEndpoint, params, onGetOfFirstPage);
        }
    }

    fireRequest(onGetOfAnEntity, entityMetadata, afterGetOfEntity, settings, resourceEndpoint, params, onGetOfFirstPage) {
        const processResponse = (resp) => {
            onGetOfAnEntity(entityMetadata, _.get(resp, `_embedded.${entityMetadata.resourceName}`, []));
            afterGetOfEntity(entityMetadata.entityName, resp["page"]["totalPages"])
        };

        const endpoint = (page = 0, size = settings.pageSize) => `${resourceEndpoint}?${params(page, size)}`;
        return getJSON(endpoint()).then((response) => {
            //first page
            const page = response["page"];
            processResponse(response);
            onGetOfFirstPage(entityMetadata.entityName, page);

            //rest pages
            const chainedRequests = new ChainedRequests();
            _.range(1, page.totalPages, 1)
                .forEach((pageNumber) => chainedRequests.push(chainedRequests.get(
                    endpoint(pageNumber),
                    (resp) => processResponse(resp))));

            return chainedRequests.fire();
        });
    }

    getAll(entitiesMetadataWithSyncStatus, onGetOfAnEntity, onGetOfFirstPage, afterGetOfEntity) {
        return _.reduce(entitiesMetadataWithSyncStatus,
            (acc, entityMetadataWithSyncStatus) => {
                return acc
                    .then(() => this.getAllForEntity(entityMetadataWithSyncStatus, onGetOfAnEntity, onGetOfFirstPage, afterGetOfEntity));
            },
            Promise.resolve());
    }
}

export default ConventionalRestClient;
