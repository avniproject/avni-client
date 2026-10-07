import DownloadableContentService from "../DownloadableContentService";
import GlobalContext from "../../GlobalContext";
import _ from "lodash";

// The row and the service stay in the closure: a rule holding an item can read, never write.
function downloadableContentItem(row, service) {
    return {
        path: () => service.blobPath(row),
        value: (field) => row.getPayload()[field]
    };
}

// Same predicate as the downloader: a row missing either field is never cached.
function usableRows(service, category) {
    return service.getAllNonVoided()
        .filter(row => row.category === category && !_.isNil(row.sha256) && !_.isNil(row.contentKey));
}

function getDownloadableContentService() {
    return GlobalContext.getInstance().beanRegistry.getService(DownloadableContentService);
}

// Rules reach this as params.services.downloadableContent. Synchronous throughout: FE rules must
// never await. path() computes where a file would be; the render layer checks it arrived.
class DownloadableContentFacade {
    constructor() {}

    allByCategory(category) {
        const service = getDownloadableContentService();
        return usableRows(service, category).map(row => downloadableContentItem(row, service));
    }

    byPayload(category, match) {
        const service = getDownloadableContentService();
        const row = _.find(usableRows(service, category), candidate => {
            const payload = candidate.getPayload();
            return _.every(match, (value, field) => payload[field] === value);
        });
        return _.isNil(row) ? undefined : downloadableContentItem(row, service);
    }
}

const downloadableContentFacade = new DownloadableContentFacade();
export default downloadableContentFacade;
