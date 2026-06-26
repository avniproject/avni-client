import Service from "../framework/bean/Service";
import BaseService from "./BaseService";
import FileSystem from "../model/FileSystem";
import {downloadWithoutAuth} from "./AuthAwareDownload";
import {get} from "../framework/http/requests";
import General from "../utility/General";
import fs from 'react-native-fs';
import _ from "lodash";
import {DownloadableContent} from 'avni-models';

@Service("downloadableContentService")
class DownloadableContentService extends BaseService {
    constructor(db, context) {
        super(db, context);
    }

    getSchema() {
        return DownloadableContent.schema.name;
    }

    blobPath(sha256) {
        return `${FileSystem.getModelsDir()}/${sha256}.bin`;
    }

    keyPath(sha256) {
        return `${FileSystem.getModelKeysDir()}/${sha256}.key`;
    }

    async downloadContent(statusMessageCallBack = _.noop) {
        const items = this.getAllNonVoided().filter(item => !_.isNil(item.contentKey) && !_.isNil(item.sha256));
        if (_.isEmpty(items)) {
            return [];
        }
        const failures = [];
        for (const item of items) {
            try {
                await this.downloadItem(item);
            } catch (error) {
                General.logError("DownloadableContentService", `Failed to download content '${item.name}': ${error && error.message}`);
                failures.push(item.name);
            }
        }
        await this.cleanupSupersededBlobs(items);
        if (!_.isEmpty(failures)) {
            statusMessageCallBack("contentNotDownloaded");
        }
        return failures;
    }

    async downloadItem(item) {
        const blobPath = this.blobPath(item.sha256);
        if (await fs.exists(blobPath)) {
            if (item.needsKey) {
                await this.ensureKey(item.sha256);
            }
            return;
        }
        await this.downloadBlob(item, blobPath);
        if (item.needsKey) {
            await this.ensureKey(item.sha256);
        }
    }

    // The blob is ciphertext; its plaintext SHA-256 cannot be verified here. Integrity is
    // enforced natively at decrypt time (GCM tag + plaintext-SHA). We only guard against a
    // truncated download by comparing the declared content length to the written size.
    async downloadBlob(item, blobPath) {
        const signedUrl = await this.getBlobUrl(item.contentKey);
        const response = await downloadWithoutAuth(signedUrl, blobPath);
        try {
            await this.verifyDownloadSize(response, blobPath);
        } catch (error) {
            await this.unlinkIfExists(blobPath);
            throw error;
        }
    }

    async verifyDownloadSize(response, blobPath) {
        const stats = await fs.stat(blobPath);
        if (!(stats.size > 0)) {
            throw new Error(`Downloaded blob is empty: ${blobPath}`);
        }
        const expected = this.contentLength(response);
        if (!_.isNil(expected) && stats.size !== expected) {
            throw new Error(`Truncated download for ${blobPath}: expected ${expected} bytes, got ${stats.size}`);
        }
    }

    contentLength(response) {
        const headers = response.respInfo ? response.respInfo.headers : undefined;
        const raw = headers && (headers['Content-Length'] || headers['content-length']);
        const parsed = parseInt(raw, 10);
        return _.isNaN(parsed) ? undefined : parsed;
    }

    getBlobUrl(contentKey) {
        return get(`${this.getServerUrl()}/media/modelBlobUrl?key=${contentKey}`);
    }

    async ensureKey(sha256) {
        if (await fs.exists(this.keyPath(sha256))) {
            return;
        }
        const key = await get(`${this.getServerUrl()}/media/modelKey?sha256=${sha256}`);
        if (_.isEmpty(key)) {
            throw new Error(`Empty model key for sha256 ${sha256}`);
        }
        await fs.mkdir(FileSystem.getModelKeysDir());
        await this.writeKeyAtomically(sha256, key);
    }

    async writeKeyAtomically(sha256, key) {
        const finalPath = this.keyPath(sha256);
        const tempPath = `${finalPath}.tmp`;
        await this.unlinkIfExists(tempPath);
        await fs.writeFile(tempPath, key, 'utf8');
        await fs.moveFile(tempPath, finalPath);
    }

    async cleanupSupersededBlobs(items) {
        const liveShas = new Set(items.map(item => item.sha256));
        await this.removeStale(FileSystem.getModelsDir(), '.bin', liveShas);
        await this.removeStale(FileSystem.getModelKeysDir(), '.key', liveShas);
    }

    async removeStale(dir, suffix, liveShas) {
        try {
            if (!await fs.exists(dir)) {
                return;
            }
            const entries = await fs.readDir(dir);
            for (const entry of entries) {
                if (!entry.name.endsWith(suffix)) {
                    continue;
                }
                const sha = entry.name.slice(0, -suffix.length);
                if (!liveShas.has(sha)) {
                    await this.unlinkIfExists(entry.path);
                }
            }
        } catch (error) {
            General.logError("DownloadableContentService", `Cleanup of ${dir} failed: ${error && error.message}`);
        }
    }

    async unlinkIfExists(path) {
        try {
            if (await fs.exists(path)) {
                await fs.unlink(path);
            }
        } catch (error) {
            General.logDebug("DownloadableContentService", `unlink failed for ${path}: ${error && error.message}`);
        }
    }
}

export default DownloadableContentService;
