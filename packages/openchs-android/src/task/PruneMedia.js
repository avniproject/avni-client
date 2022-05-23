import {Concept, Observation, Schema} from 'avni-models';
import fs from 'react-native-fs';
import FileSystem from "../model/FileSystem";
import General from "../utility/General";
import BaseTask from "./BaseTask";
import ErrorHandler from "../utility/ErrorHandler";

const imageObservationDoesNotExist = (db) => (image) => {
    return db.objects(Observation.schema.name).filtered(
        `(concept.datatype == "${Concept.dataType.Image}" OR  concept.datatype == "${Concept.dataType.Video}" OR  concept.datatype == "${Concept.dataType.Audio}") and valueJSON contains[c] "${image}"`)
        .length === 0;
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
    execute() {
        try {
            General.logInfo("PruneMedia", "PruneMedia job started");

            const pruneImageDir = pruneMedia(this.db, FileSystem.getImagesDir());
            const pruneProfilePicsDir = pruneMedia(this.db, FileSystem.getProfilePicsDir());
            const pruneVideoDir = pruneMedia(this.db, FileSystem.getVideosDir());

            return Promise.all(pruneImageDir, pruneProfilePicsDir, pruneVideoDir).catch((e) => {
                ErrorHandler.postScheduledJobError(e);
            });
        } catch (e) {
            ErrorHandler.postScheduledJobError(e);
        }
    }
}

export default new PruneMedia();
