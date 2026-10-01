import Service from "../framework/bean/Service";
import BaseService from "./BaseService";
import FileSystem from "../model/FileSystem";
import {downloadWithoutAuth} from "./AuthAwareDownload";
import {get} from "../framework/http/requests";
import General from "../utility/General";
import fs from 'react-native-fs';
import {clearGuidanceBlobCache} from "../model/CaptureGuidance";
import _ from "lodash";
import {DownloadableContent} from 'avni-models';

// Mirrors the server's ManagedContentNamespace. A contentKey arrives from the server and the app
// writes where it says, so it must never point outside a directory this service owns.
const MANAGED_NAMESPACES = Object.freeze(['models', 'guidance']);

export function isManagedContentKey(contentKey) {
    if (!_.isString(contentKey)) return false;
    const separator = contentKey.indexOf('/');
    if (separator < 0) return false;
    const namespace = contentKey.slice(0, separator);
    const fileName = contentKey.slice(separator + 1);
    return _.includes(MANAGED_NAMESPACES, namespace)
        && fileName.length > 0
        && !fileName.includes('/')
        && fileName !== '.' && fileName !== '..';
}

// Pure, so EdgeModelService shares it without either service being injected into the other.
export function contentBlobPath(item) {
    const contentKey = _.isString(item) ? item : _.get(item, 'contentKey');
    if (!isManagedContentKey(contentKey)) {
        throw new Error(`Refusing to resolve a path for unmanaged content key '${contentKey}'`);
    }
    return `${FileSystem.getDownloadableContentRootDir()}/${contentKey}`;
}

function managedContentDirs() {
    return MANAGED_NAMESPACES.map(namespace => `${FileSystem.getDownloadableContentRootDir()}/${namespace}`);
}

// A failed request rejects with a ServerError whose message is the coerced Response ("[object Object]");
// the useful detail is the HTTP status. Produce a diagnosable string: HTTP status, a usable message, or a
// JSON fallback — never a bare "[object Object]".
export function describeError(error) {
    if (!error) return "unknown error";
    const status = _.get(error, "response.status");
    const message = _.isString(error.message) && error.message !== "[object Object]" ? error.message : null;
    const parts = [];
    if (status) parts.push(`HTTP ${status}`);
    if (message) parts.push(message);
    if (parts.length > 0) return parts.join(" ");
    try {
        const json = JSON.stringify(error);
        if (json && json !== "{}") return json;
    } catch (e) { /* circular/unserializable — fall through */ }
    return "unserializable error";
}

@Service("downloadableContentService")
class DownloadableContentService extends BaseService {
    constructor(db, context) {
        super(db, context);
    }

    getSchema() {
        return DownloadableContent.schema.name;
    }

    // Byte-identical to the pre-namespace path for a model, so an upgrade re-downloads nothing.
    blobPath(item) {
        return contentBlobPath(item);
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
                General.logError("DownloadableContentService", `Failed to download content '${item.name}' (${item.contentKey}): ${describeError(error)}`);
                failures.push(item.name);
            }
        }
        await this.cleanupSupersededBlobs(items);
        // A sync may have brought a previously-missing model on device. Let inference re-attempt
        // images it had given up on this session (see EdgeModelService.onModelContentSynced).
        this.getService("edgeModelService").onModelContentSynced();
        clearGuidanceBlobCache(); // blobs may have moved; make the render-time check ask again
        if (!_.isEmpty(failures)) {
            statusMessageCallBack("contentNotDownloaded");
        }
        return failures;
    }

    async downloadItem(item) {
        const blobPath = this.blobPath(item);
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

    // An encrypted blob is ciphertext — integrity is enforced natively at decrypt time, so only a
    // truncation check is possible. An unencrypted blob is its own plaintext, so it is hashed.
    async downloadBlob(item, blobPath) {
        const signedUrl = await this.getBlobUrl(item.contentKey);
        const response = await downloadWithoutAuth(signedUrl, blobPath);
        try {
            // A signed URL can resolve with a non-2xx error body (e.g. expired URL returns a
            // small XML error). Reject it before the size check so the error body is never
            // cached as the blob and read as ciphertext on the next sync.
            this.verifyDownloadStatus(response);
            await this.verifyDownloadSize(response, blobPath);
            if (!item.needsKey) {
                await this.verifyPlaintextHash(item, blobPath);
            }
        } catch (error) {
            await this.unlinkIfExists(blobPath);
            throw error;
        }
    }

    // Closes the right-size-but-corrupt gap; the catch above deletes it so the next sync re-fetches.
    async verifyPlaintextHash(item, blobPath) {
        const actual = await fs.hash(blobPath, 'sha256');
        if (_.toLower(actual) !== _.toLower(item.sha256)) {
            throw new Error(`Content hash mismatch for ${blobPath}: expected ${item.sha256}, got ${actual}`);
        }
    }

    verifyDownloadStatus(response) {
        const status = response.respInfo && response.respInfo.status;
        if (!(status >= 200 && status < 300)) {
            throw new Error(`Blob download failed with HTTP ${status}`);
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
        // Only directories this service owns: the content root also holds the user's own media.
        const liveByDir = new Map(managedContentDirs().map(dir => [dir, new Set()]));
        let unresolvable = false;
        for (const item of items) {
            const path = this.blobPathOrNull(item);
            if (_.isNil(path)) {
                unresolvable = true;
                continue;
            }
            const separator = path.lastIndexOf('/');
            const live = liveByDir.get(path.slice(0, separator));
            if (live) live.add(path.slice(separator + 1));
        }
        // An unparseable key leaves its blob out of the live set, so sweeping would delete a file
        // still in use that downloadItem could not fetch back.
        if (unresolvable) {
            General.logError("DownloadableContentService",
                "Skipping blob cleanup: at least one content key could not be resolved to a path");
        } else {
            for (const [dir, live] of liveByDir) {
                await this.removeStale(dir, name => live.has(name));
            }
        }
        const liveShas = new Set(items.map(item => item.sha256));
        await this.removeStale(FileSystem.getModelKeysDir(),
            name => name.endsWith('.key') && liveShas.has(name.slice(0, -'.key'.length)));
    }

    blobPathOrNull(item) {
        try {
            return this.blobPath(item);
        } catch (error) {
            General.logError("DownloadableContentService", error.message);
            return null;
        }
    }

    async removeStale(dir, isLive) {
        try {
            if (!await fs.exists(dir)) {
                return;
            }
            const entries = await fs.readDir(dir);
            for (const entry of entries) {
                // Unlinking a directory would take whatever is inside it.
                if (_.isFunction(entry.isFile) && !entry.isFile()) {
                    continue;
                }
                if (!isLive(entry.name)) {
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
