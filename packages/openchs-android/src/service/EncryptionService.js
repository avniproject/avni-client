import BaseService from "./BaseService";
import Service from "../framework/bean/Service";
import RealmFactory from "../framework/db/RealmFactory";
import fs from "react-native-fs";

import * as Keychain from 'react-native-keychain';
import General from "../utility/General";
import base64 from "base-64";
import {randomBytes} from "react-native-randombytes";
import GlobalContext from "../GlobalContext";
import {getGenericPassword} from "react-native-keychain";

const CREDENTIAL_USERNAME = "avni-user";

@Service("encryptionService")
export default class EncryptionService extends BaseService {

    constructor(db, context) {
        super(db, context);
    }

    async isAlreadyEncrypted() {
        const credentials = await Keychain.getGenericPassword();
        return (credentials && credentials.username === CREDENTIAL_USERNAME);
    }

    async encryptRealm() {
        let isAlreadyEncrypted = await this.isAlreadyEncrypted();
        if (isAlreadyEncrypted) {
            General.logDebug("EncryptionService", "Realm already encrypted");
            return;
        }
        General.logDebug("EncryptionService", "Encryption started");
        const key = await this.createKey();
        let oldPath = this.db.path;
        let newPath = `${oldPath}.encrypted`;
        let newConfig = {encryptionKey: key, path: newPath};

        General.logDebug("EncryptionService", "Writing encrypted copy");
        this.db.writeCopyTo(newConfig);
        this.db.close();

        General.logDebug("EncryptionService", "Moving the encrypted copy to the old path");
        await fs.moveFile(newPath, oldPath);

        General.logDebug("EncryptionService", "Reinitializing the db");
        await GlobalContext.getInstance().reinitializeDatabase(RealmFactory);
        General.logDebug("EncryptionService", "Encryption completed");
    }

    async decryptRealm() {
        let isAlreadyEncrypted = await this.isAlreadyEncrypted();
        if (!isAlreadyEncrypted) {
            General.logDebug("EncryptionService", "Realm already decrypted");
            return;
        }
        General.logDebug("EncryptionService", "Decryption started");
        let oldPath = this.db.path;
        let newPath = `${oldPath}.decrypted`;
        let newConfig = {path: newPath};

        General.logDebug("EncryptionService", "Writing decrypted copy");
        this.db.writeCopyTo(newConfig); //No key implies no encryption

        this.db.close();
        General.logDebug("EncryptionService", "Moving the decrypted copy to the old path");
        await fs.moveFile(newPath, oldPath);

        General.logDebug("EncryptionService", "Resetting the encryption key");
        await this.resetEncryptionKey();

        General.logDebug("EncryptionService", "Reinitializing the db");
        await GlobalContext.getInstance().reinitializeDatabase(RealmFactory);
        General.logDebug("EncryptionService", "Decryption complete");
    }

    static async getEncryptionKey() {
        function stringToByteArray(s) {
            var result = new Uint8Array(s.length);
            for (var i=0; i<s.length; i++){
                result[i] = s.charCodeAt(i);
            }
            return result;
        }

        const CREDENTIAL_USERNAME = "avni-user";
        const credentials = await getGenericPassword();
        let key = null;
        if (credentials && credentials.username === CREDENTIAL_USERNAME) {
            let rawDecodedString = base64.decode(credentials.password);
            key = stringToByteArray(rawDecodedString);
        }

        return key;
    }



    async resetEncryptionKey() {
        await Keychain.resetGenericPassword();
    }

    async createKey() {
        try {
            let rawBuffer = randomBytes(64);
            const key = Uint8Array.from(rawBuffer);
            const encodedKey = rawBuffer.toString('base64');
            // let hexEncodedKey = rawBuffer.toString('hex'); - to decrypt and check in realm studio
            await Keychain.setGenericPassword(CREDENTIAL_USERNAME, encodedKey);

            return key;
        } catch (error) {
            console.log("Keychain couldn't be accessed!", error);
            throw error;
        }
    }
}
