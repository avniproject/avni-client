import {NativeModules} from "react-native";
import BaseService from "./BaseService";
import Service from "../framework/bean/Service";
import BatchRequest from "../framework/http/BatchRequest";

@Service("exportService")
class ExportService extends BaseService {
    constructor(db, beanStore) {
        super(db, beanStore);
        const batchRequests = new BatchRequest();
        this.fire = batchRequests.fire;
        this.post = batchRequests.post;
    }

    // downloadAll(done, errorHandler) {
    //     const downloadDir = `${RNFetchBlob.fs.dirs.DownloadDir}`;
    //     this.getService(QuestionnaireService).getQuestionnaireNames().map((questionnaire)=>
    //         RNFetchBlob.fs.createFile(`${downloadDir}/${General.replaceAndroidIncompatibleChars(questionnaire.name)}_${General.getSafeTimeStamp()}.csv`, this.exportContents(questionnaire)).catch(errorHandler)
    //     );
    //     setTimeout(()=>done(), 1000);
    // }
    //
    // exportAll(done, errorHandler) {
    //     const exportURL = `${this.getService(SettingsService).getServerURL()}/export`;
    //     this.exportFileTo(exportURL);
    //     setTimeout(()=>this.fire(done, errorHandler), 1000);
    // }
    //
    // exportFileTo(exportURL) {
    //     return (questionnaire) => {
    //         const fileContents = this.exportContents(questionnaire);
    //         const fileName = `${General.replaceAndroidIncompatibleChars(questionnaire.name)}_${General.getTimeStamp()}.csv`;
    //         this.post(`${exportURL}/${fileName}`, fileContents, ()=> {
    //         });
    //     }
    // }
}

export default ExportService;