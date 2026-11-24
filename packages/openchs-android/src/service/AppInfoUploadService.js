import _ from 'lodash';
import fs from 'react-native-fs';
import {zip} from 'react-native-zip-archive';
import Service from "../framework/bean/Service";
import BaseService from "./BaseService";
import MediaQueueService from "./MediaQueueService";
import UserInfoService from "./UserInfoService";
import FileSystem from "../model/FileSystem";
import General from "../utility/General";
import FileLoggerService from "../utility/FileLoggerService";
import GlobalContext from "../GlobalContext";

const removeFileIfExists = async (path) => {
    if (!path) return;
    try {
        if (await fs.exists(path)) {
            await fs.unlink(path);
        }
    } catch (e) {
        General.logWarn("AppInfoUploadService", `Failed to remove ${path}: ${e.message}`);
    }
};

@Service("appInfoUploadService")
export default class AppInfoUploadService extends BaseService {
    constructor(db, context) {
        super(db, context);
    }

    upload(cb, providedUsername = null) {
        return this._upload(cb, providedUsername);
    }

    async _upload(cb, providedUsername) {
        const mediaQueueService = this.getService(MediaQueueService);
        const fileLoggerService = new FileLoggerService();
        const uuid = General.randomUUID();
        const username = this._getUsername(providedUsername);
        const uploadFileName = `adhoc-dump-as-zip-${username}-${uuid}`;
        const destZipFile = `${FileSystem.getBackupDir()}/adhoc-${uuid}.zip`;
        const tempFiles = [];

        try {
            const filesToZip = [];
            const realmSnapshot = this._snapshotRealm(uuid);
            if (realmSnapshot) {
                filesToZip.push(realmSnapshot);
                tempFiles.push(realmSnapshot);
            }
            const sqliteSnapshot = await this._snapshotSqlite(uuid);
            if (sqliteSnapshot) {
                filesToZip.push(sqliteSnapshot);
                tempFiles.push(sqliteSnapshot);
            }
            const logSnapshot = await this._snapshotLogs(fileLoggerService, uuid);
            if (logSnapshot) {
                filesToZip.push(logSnapshot);
                tempFiles.push(logSnapshot);
            }

            if (filesToZip.length === 0) {
                throw new Error("No databases or logs available to upload");
            }

            await zip(filesToZip, destZipFile);

            General.logDebug("AppInfoUploadService", "Getting upload location");
            cb(10, "backupUploading");

            const url = await mediaQueueService.getDumpUploadUrl(MediaQueueService.DumpType.Adhoc, uploadFileName);
            await mediaQueueService.foregroundUpload(url, destZipFile, (written, total) => {
                General.logDebug("AppInfoUploadService", `Upload in progress ${written}/${total}`);
                cb(10 + (97 - 10) * (written / total), "backupUploading");
            });

            cb(97, "backupUploading");
            for (const f of tempFiles) await removeFileIfExists(f);
            cb(99, "backupUploading");
            await removeFileIfExists(destZipFile);
            cb(100, "backupCompleted");
        } catch (error) {
            General.logError("AppInfoUploadService", error);
            for (const f of tempFiles) await removeFileIfExists(f).catch(() => {});
            await removeFileIfExists(destZipFile).catch(() => {});
            cb(100, "backupFailed");
        }
    }

    _snapshotRealm(uuid) {
        try {
            const realm = GlobalContext.getInstance().db;
            if (!realm || typeof realm.writeCopyTo !== "function") return null;
            const dest = `${FileSystem.getBackupDir()}/adhoc-${uuid}.realm`;
            realm.writeCopyTo({path: dest});
            General.logDebug("AppInfoUploadService", `Including realm snapshot: ${dest}`);
            return dest;
        } catch (e) {
            General.logWarn("AppInfoUploadService", `Realm snapshot skipped: ${e.message}`);
            return null;
        }
    }

    async _snapshotSqlite(uuid) {
        try {
            const sqliteProxy = GlobalContext.getInstance().sqliteDb;
            if (!sqliteProxy || !sqliteProxy.db || typeof sqliteProxy.db.executeSync !== "function") return null;
            const dest = `${FileSystem.getBackupDir()}/adhoc-${uuid}.sqlite.db`;
            // VACUUM INTO requires the destination not to exist
            await removeFileIfExists(dest);
            const escapedPath = dest.replace(/'/g, "''");
            sqliteProxy.db.executeSync(`VACUUM INTO '${escapedPath}'`);
            General.logDebug("AppInfoUploadService", `Including sqlite snapshot: ${dest}`);
            return dest;
        } catch (e) {
            General.logWarn("AppInfoUploadService", `SQLite snapshot skipped: ${e.message}`);
            return null;
        }
    }

    async _snapshotLogs(fileLoggerService, uuid) {
        try {
            const logFilePath = await fileLoggerService.getLogFilePath();
            if (!(await fs.exists(logFilePath))) return null;
            const dest = `${FileSystem.getBackupDir()}/adhoc-${uuid}.log`;
            await fs.copyFile(logFilePath, dest);
            return dest;
        } catch (e) {
            General.logWarn("AppInfoUploadService", `Log snapshot skipped: ${e.message}`);
            return null;
        }
    }

    _getUsername(provided) {
        if (provided && provided.trim()) return provided.trim();
        try {
            const u = _.get(this.getService(UserInfoService).getUserInfo(), 'username');
            if (u && u.trim()) return u.trim();
        } catch (e) {
            General.logWarn("AppInfoUploadService", `Could not read username: ${e.message}`);
        }
        return "unknown-user";
    }
}
