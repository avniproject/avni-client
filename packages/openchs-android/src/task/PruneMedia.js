import {Concept} from "avni-models";
import fs from "react-native-fs";
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

export const conceptMediaDoesNotExist = (db) => (media) => {
    const matchingConcepts = db.objects(Concept.schema.name)
        .filtered('media.@size > 0')
        .filtered('ANY media.url CONTAINS[c] $0', media);
    
    return matchingConcepts.length === 0;
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

function pruneObservationMedia(db, directory) {
    return pruneMedia(db, directory, imageObservationDoesNotExist(db));
}

export function pruneConceptMedia(db, directory) {
    return pruneMedia(db, directory, conceptMediaDoesNotExist(db));
}

function pruneMedia(db, directory, orphanDetector) {
    General.logInfo("PruneMedia", `Pruning ${directory}`);

    return fs.readdir(directory)
        .then((allFiles) => _.filter(allFiles, orphanDetector))
        .then((orphanedFiles) => _.map(orphanedFiles, (file) => `${directory}/${file}`))
        .then((deleteList) => _.forEach(deleteList, deleteFile))
        .then(() => General.logInfo("PruneMedia", `${directory} completed`))
        .then(() => Promise.resolve());
}

class PruneMedia extends BaseTask {
    async execute() {
        try {
            await this.initDependencies();
            const globalContext = GlobalContext.getInstance();
            const pruneImageDir = pruneObservationMedia(globalContext.db, FileSystem.getImagesDir());
            const pruneVideoDir = pruneObservationMedia(globalContext.db, FileSystem.getVideosDir());
            const pruneMetadataDir = pruneConceptMedia(globalContext.db, FileSystem.getMetadataDir());

            return Promise.all([pruneImageDir, pruneVideoDir, pruneMetadataDir]).catch((e) => {
                ErrorHandler.postScheduledJobError(e);
            });
        } catch (e) {
            ErrorHandler.postScheduledJobError(e);
        }
    }
}

export default new PruneMedia();
