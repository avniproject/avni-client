import BaseService from "./BaseService";
import Service from "../framework/bean/Service";
import {MediaQueue, Individual, Encounter, ProgramEncounter, ProgramEnrolment} from "openchs-models";
import General from "../utility/General";
import SettingsService from "./SettingsService";
import _ from 'lodash';
import {get} from '../framework/http/requests';
import RNFetchBlob from 'rn-fetch-blob';
import FileSystem from "../model/FileSystem";
import fs from 'react-native-fs';
import IndividualService from "./IndividualService";
import IndividualEncounterService from "./IndividualEncounterService";
import ProgramEncounterService from "./program/ProgramEncounterService";
import ProgramEnrolmentService from "./ProgramEnrolmentService";

@Service("mediaQueueService")
class MediaQueueService extends BaseService {
    constructor(db, context) {
        super(db, context);
    }

    getSchema() {
        return MediaQueue.schema.name;
    }

    fileExistsInQueue(fileName) {
        return this.getAll().filtered(`fileName == '${fileName}'`).length > 0;
    }

    addToQueue(entity, schemaName, fileName, type) {
        //Guard against infinite loop. Uploading MediaQueueItem saves entity with the uploaded url.
        //This will trigger an addToQueue once again.
        const fileHasAlreadyBeenUploaded = _.startsWith(fileName, 'http');
        if (fileHasAlreadyBeenUploaded) {
            General.logDebug("MediaQueueService", `${fileName} has already been uploaded. Ignoring... `);
            return;
        }

        General.logInfo('MediaQueueService', `Adding ${fileName} to queue`);
        if (this.fileExistsInQueue(fileName)) return;
        this.runInTransaction(() => {
            this.db.create(MediaQueue.schema.name, MediaQueue.create(entity.uuid, schemaName, fileName, type));
        });
    }

    addMediaToQueue(entity, schemaName) {
        _.forEach(entity.findMediaObservations(), (observation) => {
            this.addToQueue(entity, schemaName, observation.getValue(), observation.concept.datatype)
        });
    }

    popItem(mediaQueueItem) {
        General.logDebug("MediaQueueService", `Deleting Media QueueItem ${mediaQueueItem.uuid}`);
        const itemToBeDeleted = this.findByUUID(mediaQueueItem.uuid, MediaQueue.schema.name);
        this.db.write(() => this.db.delete(itemToBeDeleted));
    }

    getAbsoluteFileName(mediaQueueItem) {
        const directory = mediaQueueItem.type === "Image" ? FileSystem.getImagesDir() : FileSystem.getVideosDir();
        return `${directory}/${mediaQueueItem.fileName}`;
    }

    getUploadUrl(mediaQueueItem, auth) {
        const settingsService = this.getService(SettingsService);
        const serverUrl = settingsService.getSettings().serverURL;
        return get(`${serverUrl}/media/uploadUrl/${mediaQueueItem.fileName}`, auth)
    }

    mediaExists(mediaQueueItem) {
        return fs.exists(this.getAbsoluteFileName(mediaQueueItem));
    }

    uploadToUrl(url, mediaQueueItem) {
        General.logDebug("MediaQueueService", `Uploading media to ${url}`)
        const contentType = mediaQueueItem.type === "Image" ? "image/jpeg": "video/mp4";
        return RNFetchBlob.fetch('PUT', url, {
            "Content-Type": contentType,
        }, RNFetchBlob.wrap(this.getAbsoluteFileName(mediaQueueItem)));
    }

    deleteFile(mediaQueueItem) {
        let absoluteFileName = this.getAbsoluteFileName(mediaQueueItem);
        General.logDebug("MediaQueueService", `Deleting media ${absoluteFileName}`);
        return fs.unlink(absoluteFileName);
    }

    replaceObservation(mediaQueueItem, url) {
        General.logDebug("MediaQueueService", `Replacing observation with value ${url}`);

        const canonicalUrl = url.substring(0, url.indexOf("?"));
        const entity = this.findByUUID(mediaQueueItem.entityUUID, mediaQueueItem.entityName).cloneForEdit();
        entity.replaceObservation(mediaQueueItem.fileName, canonicalUrl);
        switch (mediaQueueItem.entityName) {
            case Individual.schema.name:
                return this.getService(IndividualService).register(entity);
            case Encounter.schema.name:
                this.getService(IndividualEncounterService).saveOrUpdate(entity);
                break;
            case ProgramEncounter.schema.name:
                this.getService(ProgramEncounterService).saveOrUpdate(entity);
                break;
            case ProgramEnrolment.schema.name:
                Promise.resolve(this.getService(ProgramEnrolmentService).enrol(entity));
                break;
        }
    }

    uploadMediaQueueItem(mediaQueueItem, auth) {
        // Media can get deleted from the system by a user action.
        // The system should still work with missing media.
        // However, we need to find some way of highlighting this to user.
        if (!this.mediaExists(mediaQueueItem)) {
            General.logDebug("MediaQueueService", `mediaQueueItem ${mediaQueueItem.fileName} does not exist. Ignoring...`);
            return;
        }

        let uploadUrl = "";

        return this.getUploadUrl(mediaQueueItem, auth)
            .then((url) => {
                uploadUrl = url
            })
            .then(() => this.uploadToUrl(uploadUrl, mediaQueueItem))
            .then(() => this.replaceObservation(mediaQueueItem, uploadUrl))
            .then(() => this.popItem(mediaQueueItem))
            .catch((error) => {
                General.logError("MediaQueueService", `Error while uploading ${mediaQueueItem.uuid}`);
                General.logError("MediaQueueService", error);
            });//Ignore errors, but log them;
    }

    isMediaUploadRequired() {
        return this.findAll().length > 0;
    }

    uploadMedia(auth) {
        // Parallel push to S3 ensures maximal usage of existing bandwidth.
        // Return only once everything is complete. Errors are logged in console only
        const mediaQueueItems = _.map(this.findAll(), (mediaQueueItem) => mediaQueueItem.clone());
        return Promise.all(
            _.map(mediaQueueItems,
                (mediaQueueItem) => {
                return this.uploadMediaQueueItem(mediaQueueItem, auth)
                }
            )
        );
    }
}

export default MediaQueueService;
