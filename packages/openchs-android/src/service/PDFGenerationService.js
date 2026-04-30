import BaseService from "./BaseService";
import Service from "../framework/bean/Service";
import RNHTMLtoPDF from "react-native-html-to-pdf";
import Share from "react-native-share";
import RNFS from "react-native-fs";
import _ from "lodash";
import moment from "moment";
import UserInfoService from "./UserInfoService";
import MessageService from "./MessageService";
import General from "../utility/General";
import ErrorUtil from "../framework/errorHandling/ErrorUtil";

// Page size must stay in sync between any caller's CSS @page rule and this PAGE constant.
// Points = pixels at 72 DPI. A4 = 210mm × 297mm = 595 × 842 points.
export const PAGE = {
    name: "A4",
    orientation: "portrait",
    widthPoints: 595,
    heightPoints: 842,
    heightMm: 297,
    marginTopMm: 14,
    marginBottomMm: 18,
};

function escapeHtml(value) {
    if (_.isNil(value)) return "";
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

// Generic HTML → PDF → share-sheet pipeline. Knows nothing about Avni domain entities.
// Domain-specific HTML composition (e.g. subject header, observation rows for forms;
// custom card content for dashboards) lives in callers like FormPDFService.
@Service("pdfGenerationService")
class PDFGenerationService extends BaseService {
    constructor(db, beanStore) {
        super(db, beanStore);
    }

    init() {
        this.I18n = this.getService(MessageService).getI18n();
    }

    getFooterText() {
        const userInfo = this.getService(UserInfoService).getUserInfo();
        const username = _.get(userInfo, "username") || _.get(userInfo, "name") || "";
        const timestamp = moment().format("DD-MM-YYYY HH:mm");
        return `${this.I18n.t("generatedByAvni")} · ${escapeHtml(username)} · ${timestamp}`;
    }

    async _generatePdfFromHtml(html, fileName) {
        const result = await RNHTMLtoPDF.convert({
            html,
            fileName,
            width: PAGE.widthPoints,
            height: PAGE.heightPoints,
            padding: 0,
        });
        const tempPath = _.get(result, "filePath");
        if (_.isEmpty(tempPath)) return null;

        // The library writes to the cache dir with a random suffix (e.g. "foo_24_04_20264923.pdf").
        // Rename to the exact filename so the share sheet / receiving apps show the right name.
        // If the rename fails, fall back to the library's path so sharing still works.
        const finalPath = `${RNFS.CachesDirectoryPath}/${fileName}.pdf`;
        try {
            if (await RNFS.exists(finalPath)) {
                await RNFS.unlink(finalPath);
            }
            await RNFS.moveFile(tempPath, finalPath);
        } catch (e) {
            General.logError("PDFGenerationService._generatePdfFromHtml", `Rename failed, falling back to temp path: ${e.message}`);
            return tempPath;
        }
        return finalPath;
    }

    async _sharePdfFromFile(filePath, fileName) {
        const url = filePath.startsWith("file://") ? filePath : `file://${filePath}`;
        await Share.open({
            url,
            type: "application/pdf",
            filename: fileName,
            failOnCancel: false,
            showAppsToView: true,
        });
    }

    async shareHtmlAsPdf(html, fileName) {
        try {
            const filePath = await this._generatePdfFromHtml(html, fileName);
            if (_.isEmpty(filePath)) {
                throw new Error("PDF generation returned empty path");
            }
            await this._sharePdfFromFile(filePath, fileName);
            return {success: true};
        } catch (error) {
            if (error?.message === "User did not share" || error?.error === "User did not share") {
                return {success: false, cancelled: true};
            }
            General.logError("PDFGenerationService.shareHtmlAsPdf", error);
            ErrorUtil.notifyBugsnag(error, "PDFGenerationService");
            return {success: false, error};
        }
    }
}

export default PDFGenerationService;
