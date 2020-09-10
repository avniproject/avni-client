import {EntitySyncStatus, IdentifierAssignment, Schema, UserInfo} from 'avni-models';
import Realm from 'realm';
import FileSystem from "./model/FileSystem";
import {ToastAndroid} from 'react-native';
import General from "./utility/General";
import fs from 'react-native-fs';

const REALM_FILE_NAME = "default.realm";
const DESTINATION_FILE_PATH = `${fs.DocumentDirectoryPath}/${REALM_FILE_NAME}`;

const deleteUserInfoAndIdAssignment = (db, entitySyncStatus) => {
    db.write(() => {
        const objects = db.objects(UserInfo.schema.name);
        const assignmentObjects = db.objects(IdentifierAssignment.schema.name);
        db.delete(objects);
        db.delete(assignmentObjects);
        entitySyncStatus.forEach(({uuid, entityName, entityTypeUuid}) => {
            const updatedEntity = EntitySyncStatus.create(entityName, EntitySyncStatus.REALLY_OLD_DATE, uuid, entityTypeUuid);
            db.create(EntitySyncStatus.schema.name, updatedEntity, true);
        })
    });
};

const restoreDeletedOrUpdatedEntities = (db, userInfo, entitySyncStatus, identifierAssignment) => {
    db.write(() => {
        _.forEach(userInfo, ui => db.create(UserInfo.schema.name, ui, true));
        _.forEach(entitySyncStatus, ({uuid, entityName, loadedSince, entityTypeUuid}) => {
            const updatedEntity = EntitySyncStatus.create(entityName, loadedSince, uuid, entityTypeUuid);
            db.create(EntitySyncStatus.schema.name, updatedEntity, true)
        });
        _.forEach(identifierAssignment, ida => db.create(IdentifierAssignment.schema.name, ida, true));
    });
};

export const backup = (fileName) => {
    const db = new Realm(Schema);
    const userInfo = db.objects(UserInfo.schema.name).map(u => _.assign({}, u));
    const entitySyncStatus = db.objects(EntitySyncStatus.schema.name)
        .filtered(`entityName = 'IdentifierAssignment'`)
        .map(u => _.assign({}, u));
    const identifierAssignment = db.objects(IdentifierAssignment.schema.name).map(u => _.assign({}, u));
    fs.readDir(FileSystem.getBackupDir())
        .then((files) => files.forEach(file => fs.unlink(file.path)))
        .then(() => deleteUserInfoAndIdAssignment(db, entitySyncStatus))
        .then(() => db.writeCopyTo(`${FileSystem.getBackupDir()}/${fileName}`))
        .then(() => restoreDeletedOrUpdatedEntities(db, userInfo, entitySyncStatus, identifierAssignment))
        .then(() => ToastAndroid.show('Backup Complete', ToastAndroid.SHORT))
        .catch((error) => {
            General.logError(`Error while taking backup, ${error.message}`);
            throw error;
        });
};

export const restore = async (backupFilePath) => {
    await fs.exists(DESTINATION_FILE_PATH)
        .then((exists) => exists && fs.unlink(DESTINATION_FILE_PATH))
        .then(() => fs.copyFile(backupFilePath, DESTINATION_FILE_PATH))
        .then(() => fs.unlink(backupFilePath))
        .then(() => ToastAndroid.show('Backup Restored', ToastAndroid.SHORT))
        .catch((error) => {
            General.logError(`Error while restoring file, ${error.message}`);
            throw error;
        });
};

export const removeBackupFile = async (backupFilePath) => {
    await fs.exists(backupFilePath)
        .then((exists) => exists && fs.unlink(backupFilePath))
        .catch((error) => {
            General.logError(`Error while removing backup file, ${error.message}`);
            throw error;
        });
};

