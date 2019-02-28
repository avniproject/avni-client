import Realm from 'realm';
import {Schema, Observation, Concept} from "openchs-models";
import fs from 'react-native-fs';
import FileSystem from "../model/FileSystem";
import General from "../utility/General";

const imageObservationDoesNotExist = (db) => (image) => {
    return db.objects(Observation.schema.name).filtered(
        `(concept.datatype == "${Concept.dataType.Image}" OR  concept.datatype == "${Concept.dataType.Video}") and valueJSON contains[c] "${image}"`)
        .length == 0;
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
            }
        );
};

function pruneMedia(db, directory) {
    General.logInfo("PruneMedia", `Pruning ${directory}`);

    return fs.readdir(directory)
        .then((images) => _.filter(images, imageObservationDoesNotExist(db)))
        .then((images) => _.map(images, (image) => `${directory}/${image}`))
        .then((deleteList) => _.forEach(deleteList, deleteFile));
}

const PruneMedia = () => {
    General.logInfo("PruneMedia", "PruneMedia service started");

    const db = new Realm(Schema);

    const pruneImageDir = pruneMedia(db, FileSystem.getImagesDir());
    const pruneVideoDir = pruneMedia(db, FileSystem.getVideosDir());

    return Promise.all(pruneImageDir, pruneVideoDir);
};

export default PruneMedia;