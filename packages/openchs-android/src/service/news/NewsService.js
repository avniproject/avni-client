import Service from "../../framework/bean/Service";
import BaseService from "../BaseService";
import {News} from "avni-models";
import MediaService from "../MediaService";
import General from "../../utility/General";

@Service("newsService")
class NewsService extends BaseService {

    constructor(db, context) {
        super(db, context);
    }

    getSchema() {
        return News.schema.name;
    }

    isAnyNewsAvailable() {
        return this.getAllNonVoided().length > 0;
    }

    getAllOrderedNews() {
        return this.getAllNonVoided().sorted('publishedDate', true);
    }

    getAllNewsWithHeroImage() {
        return this.getAllNonVoided().filtered('heroImage <> null');
    }

    async downloadHeroImage(news) {
        const mediaService = this.getService(MediaService);
        const filePathInDevice = mediaService.getAbsolutePath(news.heroImage, 'News');
        const exists = await mediaService.exists(filePathInDevice);
        if (!exists) {
            return mediaService.downloadMedia(news.heroImage, filePathInDevice)
                .catch((error) => {
                    General.logDebug('NewsService', `Error while downloading image ${filePathInDevice}`);
                    General.logDebug('NewsService', error);
                })
        }
    }

    getUnreadNewsCount() {
        return this.getAllNonVoided().filtered('read = false').length;
    }

    isUnreadMoreThanZero() {
        return this.getUnreadNewsCount() > 0;
    }
}


export default NewsService;
