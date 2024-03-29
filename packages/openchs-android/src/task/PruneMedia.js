import {Concept} from 'avni-models';
import fs from 'react-native-fs';
import FileSystem from "../model/FileSystem";
import General from "../utility/General";
import BaseTask from "./BaseTask";
import ErrorHandler from "../utility/ErrorHandler";
import GlobalContext from "../GlobalContext";
import {MetaDataService} from "openchs-models";
import _ from "lodash";

export const imageObservationDoesNotExist = (db) => (media) => {
    return MetaDataService.everyObservationField((observationField, schemaName) => {
        const obsParentEntities = db.objects(schemaName).filtered(
            `(${observationField}.concept.datatype == "${Concept.dataType.Image}" OR  ${observationField}.concept.datatype == "${Concept.dataType.Video}" OR ${observationField}.concept.datatype == "${Concept.dataType.Audio}") and ${observationField}.valueJSON contains[c] "${media}"`);
        if (obsParentEntities.length === 0) return true;

        return obsParentEntities.every((parentEntity) => {
            const observations = parentEntity[observationField];
            return observations.every((obs) => {
                if (!obs.concept.isMediaConcept() || !obs.valueJSON.includes(media)) return true;
            });
        });
    });
};

const deleteFile = (file) => {
    General.logInfo("PruneMedia", `Deleting ${file}`);

    return fs.unlink(file)
        .then(
            () => {
                General.logInfo("PruneMedia", `${file} deleted`);
            },
            (error) => {
                General.logError("PruneMedia", `${file} could not be deleted`);
                General.logError("PruneMedia", error);
                throw error;
            }
        );
};

function pruneMedia(db, directory) {
    General.logInfo("PruneMedia", `Pruning ${directory}`);

    return fs.readdir(directory)
        .then((images) => _.filter(images, imageObservationDoesNotExist(db)))
        .then((images) => _.map(images, (image) => `${directory}/${image}`))
        .then((deleteList) => _.forEach(deleteList, deleteFile)).then(() => General.logInfo("PruneMedia", `${directory} Com`)).then(() => Promise.resolve());
}

class PruneMedia extends BaseTask {
    async execute() {
        try {
            General.logInfo("PruneMedia", "PruneMedia job started");
            await this.initDependencies();
            const globalContext = GlobalContext.getInstance();
            const pruneImageDir = pruneMedia(globalContext.db, FileSystem.getImagesDir());
            const pruneVideoDir = pruneMedia(globalContext.db, FileSystem.getVideosDir());

            return Promise.all(pruneImageDir, pruneVideoDir).catch((e) => {
                ErrorHandler.postScheduledJobError(e);
            });
        } catch (e) {
            ErrorHandler.postScheduledJobError(e);
        }
    }
}

export default new PruneMedia();
