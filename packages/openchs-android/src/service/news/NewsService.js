import Service from "../../framework/bean/Service";
import BaseService from "../BaseService";
import {News} from "avni-models";

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
}


export default NewsService;
