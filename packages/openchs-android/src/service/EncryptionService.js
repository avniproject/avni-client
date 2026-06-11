import BaseService from "./BaseService";
import Service from "../framework/bean/Service";
import OrganisationConfigService from "./OrganisationConfigService";
// REMOVED: Circular dependency with RealmFactory - now lazy loaded in methods
// import RealmFactory from "../framework/db/RealmFactory";
import fs from "react-native-fs";
import _ from "lodash";

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

    async encryptOrDecryptDbIfRequired() {
        const isDbEncryptionEnabled = this.getService(OrganisationConfigService).isDbEncryptionEnabled();
        if(isDbEncryptionEnabled)
            await this.encryptDb();
        else
            await this.decryptDb();
    }

    async isAlreadyEncrypted() {
        const credentials = await Keychain.getGenericPassword();
        return (credentials && credentials.username === CREDENTIAL_USERNAME);
    }

    async encryptDb() {
        let isAlreadyEncrypted = await this.isAlreadyEncrypted();
        if (isAlreadyEncrypted) {
            General.logDebug("EncryptionService", "Db already encrypted");
            return;
        }
        General.logDebug("EncryptionService", "Encryption started");
        const key = await this.createKey();
        try {
            await this._rewriteDatabases(key);
        } catch (e) {
            // No file has been swapped yet — drop the key so both DBs keep opening as plaintext
            await this.resetEncryptionKey();
            throw e;
        }
        General.logDebug("EncryptionService", "Reinitializing the db");
        await this._reinitializeDatabases();
        General.logDebug("EncryptionService", "Encryption completed");
    }

    async decryptDb() {
        let isAlreadyEncrypted = await this.isAlreadyEncrypted();
        if (!isAlreadyEncrypted) {
            General.logDebug("EncryptionService", "Db already decrypted");
            return;
        }
        General.logDebug("EncryptionService", "Decryption started");
        await this._rewriteDatabases(null);

        General.logDebug("EncryptionService", "Resetting the encryption key");
        await this.resetEncryptionKey();

        General.logDebug("EncryptionService", "Reinitializing the db");
        await this._reinitializeDatabases();
        General.logDebug("EncryptionService", "Decryption complete");
    }

    // Realm and SQLite must flip together — RealmFactory and SqliteFactory both read
    // the same keychain key on the next open, so leaving one plaintext while the key
    // exists would make it unopenable. Copies are written first while both DBs stay
    // open (a failure leaves everything untouched), then swapped in.
    async _rewriteDatabases(encryptionKey) {
        const globalContext = GlobalContext.getInstance();
        const suffix = encryptionKey ? ".encrypted" : ".decrypted";
        const databases = [];
        if (globalContext.sqliteDb) {
            databases.push({db: globalContext.sqliteDb, isSqlite: true});
        } else {
            General.logWarn("EncryptionService", "SQLite db not initialised — only Realm will be rewritten");
        }
        databases.push({db: globalContext.db, isSqlite: false});

        for (const entry of databases) {
            entry.path = entry.db.path;
            entry.copyPath = `${entry.path}${suffix}`;
            await this._removeIfExists(entry.copyPath);
            General.logDebug("EncryptionService", `Writing ${suffix.substring(1)} copy of ${entry.isSqlite ? "SQLite" : "Realm"} db`);
            entry.db.writeCopyTo(encryptionKey ? {path: entry.copyPath, encryptionKey} : {path: entry.copyPath});
        }

        for (const entry of databases) {
            entry.db.close();
            if (entry.isSqlite) {
                // Stale WAL/SHM from the old file would corrupt the swapped-in copy
                await this._removeIfExists(`${entry.path}-wal`);
                await this._removeIfExists(`${entry.path}-shm`);
            }
            General.logDebug("EncryptionService", `Moving the ${suffix.substring(1)} copy to the old path`);
            await fs.moveFile(entry.copyPath, entry.path);
        }
    }

    async _removeIfExists(path) {
        if (await fs.exists(path)) await fs.unlink(path);
    }

    async _reinitializeDatabases() {
        // Lazy load to avoid circular dependency
        const RealmFactory = require('../framework/db/RealmFactory').default;
        await GlobalContext.getInstance().reinitializeDatabase(RealmFactory);
    }

    /**
     * Heal the stale-key state left behind by an interrupted/failed encryption
     * attempt: key in keychain but DB files still plaintext. Opening a plaintext
     * Realm with a key crashes natively (SIGSEGV in librealm) before any JS error
     * handling, so this must run before the first Realm open.
     */
    static async removeStaleKeyIfDbsPlaintext() {
        const key = await EncryptionService.getEncryptionKey();
        if (_.isNil(key)) return;

        const RealmModule = require("realm");
        const Realm = RealmModule.default || RealmModule.Realm || RealmModule;
        const SqliteFactory = require("../framework/db/SqliteFactory").default;

        const states = [
            await EncryptionService._dbFileState(Realm.defaultPath, "T-DB", 16),
            await EncryptionService._dbFileState(SqliteFactory.getDbFullPath(), "SQLite format 3", 0),
        ].filter(s => s !== "missing");

        if (states.length > 0 && states.every(s => s === "plaintext")) {
            General.logWarn("EncryptionService", "Encryption key found but all db files are plaintext — removing stale key");
            await Keychain.resetGenericPassword();
        }
    }

    static async _dbFileState(path, magic, offset) {
        try {
            if (!(await fs.exists(path))) return "missing";
            const headerBase64 = await fs.read(path, offset + magic.length, 0, "base64");
            const header = base64.decode(headerBase64);
            return header.substring(offset, offset + magic.length) === magic ? "plaintext" : "encrypted";
        } catch (e) {
            General.logWarn("EncryptionService", `Could not inspect db header at ${path}: ${e.message}`);
            return "unknown";
        }
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
            General.logDebug("EncryptionService", "Keychain couldn't be accessed!");
            General.logError("EncryptionService", error);
            throw error;
        }
    }
}
