import DownloadableContentService from "../DownloadableContentService";
import GlobalContext from "../../GlobalContext";
import _ from "lodash";

// Rules reach this as params.services.downloadableContent. Synchronous throughout: FE rules must
// never await. path() computes where a file would be; the render layer checks it arrived.
class DownloadableContentItem {
    constructor(row, downloadableContentService) {
        this.row = row;
        this.downloadableContentService = downloadableContentService;
    }

    path() {
        return this.downloadableContentService.blobPath(this.row);
    }

    value(field) {
        return this.row.getPayload()[field];
    }
}

class DownloadableContentFacade {
    constructor() {}

    allByCategory(category) {
        const service = GlobalContext.getInstance().beanRegistry.getService(DownloadableContentService);
        // Same predicate as the downloader: a row missing either field is never cached.
        return service.getAllNonVoided()
            .filter(row => row.category === category && !_.isNil(row.sha256) && !_.isNil(row.contentKey))
            .map(row => new DownloadableContentItem(row, service));
    }

    byPayload(category, match) {
        return _.find(this.allByCategory(category), item => {
            const payload = item.row.getPayload();
            return _.every(match, (value, field) => payload[field] === value);
        });
    }
}

const downloadableContentFacade = new DownloadableContentFacade();
export default downloadableContentFacade;
