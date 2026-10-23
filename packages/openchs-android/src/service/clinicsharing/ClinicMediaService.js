import Service from "../../framework/bean/Service";
import BaseService from "../BaseService";
import {MediaQueue, ObservationsHolder} from 'openchs-models';
import fs from 'react-native-fs';
import DeviceInfo from "react-native-device-info";
import _ from "lodash";
import General from "../../utility/General";
import OrganisationConfigService from "../OrganisationConfigService";
import {connectToHub, MessageType} from "../../framework/clinicsharing/ClinicTransport";
import {
    HUB_MIN_FREE_STORAGE_MB,
    MEDIA_BYTES_PER_HUB_SYNC,
    MEDIA_CHUNK_BYTES
} from "../../framework/clinicsharing/ClinicSharingConstants";

const MB = 1024 * 1024;
const FETCH_IDLE_TIMEOUT_MS = 30 * 1000;
const STRAY_PART_AGE_MS = 60 * 60 * 1000;
const MEDIA_TYPES = ['Image', 'Profile-Pics', 'Video', 'Audio', 'File'];
const FILE_NAME = /^[0-9A-Fa-f-]{36}\.\w+$/;

// A bare file name means the photo hasn't reached the server yet; afterwards the value is its URL.
const isBareFileName = (value) => _.isString(value) && FILE_NAME.test(value);
const fileNameOf = (uri) => _.get(uri.trim().match(/[0-9A-Fa-f-]{36}\.\w+$/), 0);

function urlsByFileName(value, found = new Map()) {
    if (_.isString(value)) {
        if (/^https?:\/\//.test(value)) {
            const fileName = fileNameOf(value);
            if (fileName) found.set(fileName, value);
        } else if (/^\s*[[{]/.test(value)) {
            try {
                urlsByFileName(JSON.parse(value), found);
            } catch (e) {
                return found;
            }
        }
    } else if (_.isObject(value)) {
        _.forEach(value, (child) => urlsByFileName(child, found));
    }
    return found;
}

const rowsOf = (result) => result.rows._array || result.rows || [];

// Photos and files shared through the hub as viewing copies; only the phone that took one uploads it.
@Service("clinicMediaService")
class ClinicMediaService extends BaseService {
    constructor(db, context) {
        super(db, context);
        this.storageRefusal = null;
        this.fetching = new Map();
        this.fetchChain = Promise.resolve();
        this.fetchIdleTimeoutMs = FETCH_IDLE_TIMEOUT_MS;
    }

    getSchema() {
        return MediaQueue.schema.name;
    }

    clinicSharingEnabled() {
        return this.db.isSqlite === true && _.get(this.getService(OrganisationConfigService).getSettings(), 'enableClinicSharing') === true;
    }

    _pathFor(fileName, mediaType) {
        const dir = this.getService('mediaQueueService').getDirByType({type: mediaType});
        return dir && FILE_NAME.test(fileName) ? `${dir}/${fileName}` : null;
    }

    async _sizeOf(path) {
        if (!(await fs.exists(path))) return null;
        return Number((await fs.stat(path)).size);
    }

    async _replaceWith(part, path) {
        if (await fs.exists(path)) await fs.unlink(path);
        await fs.moveFile(part, path);
    }

    async _appendChunk(path, data, first) {
        if (first) await fs.writeFile(path, data, 'base64');
        else await fs.appendFile(path, data, 'base64');
    }

    async _discard(path) {
        if (await fs.exists(path)) await fs.unlink(path);
    }

    _receivedMedia() {
        const db = this.getService('clinicSpokeService')._stateSync();
        if (!this.receivedMediaReady) {
            db.executeSync('create table if not exists received_media (file_name text primary key)');
            db.executeSync('create table if not exists own_media (file_name text primary key)');
            this.receivedMediaReady = true;
        }
        return db;
    }

    // Its queue item goes once it uploads, so without this a stale copy from the hub would make it another phone's photo.
    recordOwnMedia(fileName) {
        if (!this.clinicSharingEnabled() || !isBareFileName(fileName)) return;
        this._receivedMedia().executeSync('insert into own_media (file_name) values (?) on conflict(file_name) do nothing', [fileName]);
    }

    _ownMedia() {
        return new Set([
            ...this.findAll(MediaQueue.schema.name).map((item) => item.fileName),
            ...rowsOf(this._receivedMedia().executeSync('select file_name from own_media')).map((row) => row.file_name),
        ]);
    }

    // A photo this phone took is its own, even when it comes back in another phone's edit.
    async recordReceivedMedia(entityName, entities) {
        const mediaQueueService = this.getService('mediaQueueService');
        const own = this._ownMedia();
        const fileNames = _.uniq(entities.flatMap((entity) => mediaQueueService.mediaItems(entity, entityName).map((item) => item.fileName)))
            .filter((fileName) => isBareFileName(fileName) && !own.has(fileName));
        if (fileNames.length === 0) return;
        await this._receivedMedia().executeBatch(fileNames.map((fileName) =>
            ['insert into received_media (file_name) values (?) on conflict(file_name) do nothing', [fileName]]));
    }

    isFromAnotherPhone(fileName) {
        if (!this.clinicSharingEnabled()) return false;
        return rowsOf(this._receivedMedia().executeSync('select 1 from received_media where file_name = ?', [fileName])).length > 0;
    }

    // A hub copy made before a photo uploaded still holds its bare name; saving that over the local record would lose the link.
    keepLocalLinks(schemaName, incomingEntities) {
        const mediaQueueService = this.getService('mediaQueueService');
        incomingEntities.forEach((incoming) => {
            const local = this.findByUUID(incoming.uuid, schemaName);
            if (_.isNil(local)) return;
            const links = new Map(mediaQueueService.mediaItems(local, schemaName)
                .filter(({fileName}) => /^https?:\/\//.test(fileName))
                .map(({fileName}) => [fileNameOf(fileName), fileName]));
            const kept = mediaQueueService.mediaItems(incoming, schemaName)
                .filter(({fileName}) => isBareFileName(fileName) && links.has(fileName));
            kept.forEach(({fileName, entityTargetField, conceptUUID}) => {
                if (entityTargetField === 'profilePicture') incoming.updateProfilePicture(links.get(fileName));
                else incoming.replaceMediaObservation(fileName, links.get(fileName), conceptUUID);
            });
            // A replaced answer is left as an object, and saved unconverted it would read back as "[object Object]".
            if (kept.length > 0) [incoming.observations, incoming.cancelObservations].filter(Boolean).forEach(ObservationsHolder.convertObsForSave);
        });
    }

    // A local edit kept over the server's copy still holds the bare file names; uploading them would replace the photo's link.
    adoptServerUrls(entityName, serverResources) {
        const mediaQueueService = this.getService('mediaQueueService');
        let adopted = 0;
        serverResources.forEach((resource) => {
            const urls = urlsByFileName(resource);
            if (urls.size === 0) return;
            const entity = this.findByUUID(resource.uuid, entityName);
            if (_.isNil(entity)) return;
            mediaQueueService.mediaItems(entity, entityName)
                .filter(({fileName}) => isBareFileName(fileName) && urls.has(fileName))
                .forEach((item) => {
                    if (mediaQueueService.replaceMediaValue({...item, entityUUID: resource.uuid, entityName}, urls.get(item.fileName))) adopted++;
                });
        });
        return adopted;
    }

    async pushToHub(connection, hubId, log) {
        const db = await this.getService('clinicSpokeService')._state();
        const sent = new Set(rowsOf(await db.execute('select file_name from media_sent where hub_id = ?', [hubId])).map((row) => row.file_name));
        const items = _.uniqBy(this.findAll(MediaQueue.schema.name).map((item) => _.pick(item, ['fileName', 'type', 'entityName', 'entityUUID'])), 'fileName')
            .filter((item) => !sent.has(item.fileName));
        let bytes = 0;
        let pushed = 0;
        for (const item of items) {
            if (bytes >= MEDIA_BYTES_PER_HUB_SYNC) break;
            const path = this._pathFor(item.fileName, item.type);
            const size = path && await this._sizeOf(path);
            if (!size) continue;
            const isThisFile = (reply) => reply.fileName === item.fileName;
            const ack = await connection.request({type: MessageType.mediaPush, fileName: item.fileName, mediaType: item.type,
                entityName: item.entityName, entityUUID: item.entityUUID, size}, MessageType.mediaAck, isThisFile);
            if (ack.status === 'refused') {
                log(`The hub is low on storage; files wait until it has room`);
                break;
            }
            if (ack.status === 'ready') {
                for (let position = 0; position < size; position += MEDIA_CHUNK_BYTES) {
                    connection.send({type: MessageType.mediaData, fileName: item.fileName, data: await fs.read(path, MEDIA_CHUNK_BYTES, position, 'base64')});
                }
                const saved = await connection.request({type: MessageType.mediaData, fileName: item.fileName, done: true}, MessageType.mediaAck, isThisFile);
                if (saved.status !== 'saved') {
                    log(`The hub could not save ${item.fileName}`);
                    continue;
                }
                bytes += size;
                pushed++;
            }
            if (ack.status === 'ready' || ack.status === 'have') {
                await db.execute('insert into media_sent (hub_id, file_name) values (?, ?) on conflict do nothing', [hubId, item.fileName]);
            }
        }
        return pushed;
    }

    handleOnHub(connection, message, log) {
        const handle = {
            [MessageType.mediaPush]: this._receiveHeader,
            [MessageType.mediaData]: this._receiveChunk,
            [MessageType.mediaRequest]: this._serve,
        }[message.type];
        return handle.call(this, connection, message, log);
    }

    async _receiveHeader(connection, {fileName, mediaType, entityName, entityUUID, size}, log) {
        const ack = (status) => connection.send({type: MessageType.mediaAck, fileName, status});
        const path = this._pathFor(fileName, mediaType);
        if (!path) return ack('failed');
        if (await this._sizeOf(path) === size) return ack('have');
        const {freeSpace} = await fs.getFSInfo();
        if (freeSpace - size < HUB_MIN_FREE_STORAGE_MB * MB) {
            this.storageRefusal = {at: new Date(), freeMb: Math.floor(freeSpace / MB)};
            log(`Refused ${fileName}: ${this.storageRefusal.freeMb} MB free`);
            return ack('refused');
        }
        this.storageRefusal = null;
        const incoming = {fileName, mediaType, entityName, entityUUID, size, path, part: `${path}.part`, chunks: 0};
        connection.incomingMedia = incoming;
        connection.onClose(() => connection.incomingMedia === incoming && this._discard(incoming.part));
        ack('ready');
    }

    async _receiveChunk(connection, {fileName, data, done}) {
        const incoming = connection.incomingMedia;
        if (!incoming || incoming.fileName !== fileName) return;
        if (!done) return this._appendChunk(incoming.part, data, incoming.chunks++ === 0);

        connection.incomingMedia = null;
        const ack = (status) => connection.send({type: MessageType.mediaAck, fileName, status});
        if (await this._sizeOf(incoming.part) !== incoming.size) {
            await this._discard(incoming.part);
            return ack('failed');
        }
        await this._replaceWith(incoming.part, incoming.path);
        const db = await this.getService('clinicHubService')._ledger();
        await db.execute('insert into hub_media (file_name, media_type, entity_name, entity_uuid, received_at) values (?, ?, ?, ?, ?) on conflict(file_name) do update set received_at = excluded.received_at',
            [fileName, incoming.mediaType, incoming.entityName, incoming.entityUUID, Date.now()]);
        ack('saved');
    }

    async _serve(connection, {fileName, mediaType}) {
        const path = this._pathFor(fileName, mediaType);
        const size = path && await this._sizeOf(path);
        if (!size) return connection.send({type: MessageType.mediaAck, fileName, status: 'missing'});
        connection.send({type: MessageType.mediaAck, fileName, status: 'sending', size});
        for (let position = 0; position < size; position += MEDIA_CHUNK_BYTES) {
            connection.send({type: MessageType.mediaData, fileName, data: await fs.read(path, MEDIA_CHUNK_BYTES, position, 'base64')});
        }
        connection.send({type: MessageType.mediaData, fileName, done: true});
    }

    getHubStorageRefusal() {
        return this.storageRefusal;
    }

    // Parts of a transfer that was cut off can never become a photo, so a long camp must not collect them.
    async discardStrayParts() {
        const cutoff = Date.now() - STRAY_PART_AGE_MS;
        for (const mediaType of MEDIA_TYPES) {
            const dir = this.getService('mediaQueueService').getDirByType({type: mediaType});
            if (!dir || !(await fs.exists(dir))) continue;
            const stray = (await fs.readDir(dir)).filter((file) => file.name.endsWith('.part') && new Date(file.mtime).getTime() < cutoff);
            for (const file of stray) await this._discard(file.path);
        }
    }

    // Other phones' photos: the rows that list them are about to be cleared, and nothing would find the files again.
    async discardHubCopies(db) {
        for (const row of rowsOf(await db.execute('select file_name, media_type from hub_media'))) {
            const path = this._pathFor(row.file_name, row.media_type);
            if (path) await this._discard(path);
        }
    }

    async discardFetchedCopies() {
        const own = this._ownMedia();
        const fetched = rowsOf(this._receivedMedia().executeSync('select file_name from received_media')).map((row) => row.file_name)
            .filter((fileName) => !own.has(fileName));
        for (const fileName of fetched) {
            for (const mediaType of MEDIA_TYPES) {
                const path = this._pathFor(fileName, mediaType);
                if (path) await this._discard(path);
            }
        }
    }

    fetchFromHub(source, mediaType) {
        const joined = this.getService('clinicSpokeService').joined;
        const path = joined && isBareFileName(source) && this._pathFor(source, mediaType);
        if (!path) return Promise.resolve(null);
        if (!this.fetching.has(source)) {
            const fetched = this.fetchChain.then(() => this._fetch(joined, source, mediaType, path))
                .catch((error) => {
                    General.logDebug('ClinicMediaService', `Could not fetch ${source} from the hub: ${error.message}`);
                    return null;
                })
                .finally(() => this.fetching.delete(source));
            this.fetching.set(source, fetched);
            this.fetchChain = fetched;
        }
        return this.fetching.get(source);
    }

    async _fetch({host, port, key, hubId, epoch}, fileName, mediaType, path) {
        if (await this._sizeOf(path)) return path;
        const connection = await connectToHub({host, port, key, hubId, epoch, appVersion: DeviceInfo.getVersion()});
        const part = `${path}.part`;
        try {
            await this._discard(part);
            // A hub out of range sends no FIN, and fetches queue behind each other, so a silent one must give up.
            let idle = null;
            return await new Promise((resolve, reject) => {
                let size = null;
                let chunks = 0;
                let work = Promise.resolve();
                const stillWaiting = () => {
                    clearTimeout(idle);
                    idle = setTimeout(() => reject(new Error('The hub stopped sending')), this.fetchIdleTimeoutMs);
                };
                stillWaiting();
                connection.onMessage((message) => {
                    if (message.fileName !== fileName) return;
                    stillWaiting();
                    work = work.then(async () => {
                        if (message.type === MessageType.mediaAck) {
                            if (message.status === 'sending') size = message.size;
                            else resolve(null);
                        } else if (message.type === MessageType.mediaData && !message.done) {
                            await this._appendChunk(part, message.data, chunks++ === 0);
                        } else if (message.type === MessageType.mediaData) {
                            if (await this._sizeOf(part) !== size) {
                                await this._discard(part);
                                return resolve(null);
                            }
                            await this._replaceWith(part, path);
                            resolve(path);
                        }
                    }).catch(reject);
                });
                connection.onClose(() => reject(new Error('The hub closed the connection')));
                connection.send({type: MessageType.mediaRequest, fileName, mediaType});
            }).finally(() => clearTimeout(idle));
        } finally {
            connection.close();
            await this._discard(part);
        }
    }
}

export default ClinicMediaService;
