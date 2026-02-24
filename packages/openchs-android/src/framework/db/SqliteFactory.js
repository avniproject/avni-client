/**
 * SqliteFactory - Creates and initializes an op-sqlite database with Drizzle-compatible schema.
 *
 * Responsibilities:
 * 1. Create op-sqlite database instance (with optional encryption)
 * 2. Generate schema metadata from EntityMappingConfig
 * 3. Create tables via DDL (CREATE TABLE IF NOT EXISTS)
 * 4. Create indexes for common query patterns
 * 5. Return a fully initialized SqliteProxy instance
 *
 * Note: @op-engineering/op-sqlite is imported dynamically (require()) inside createSqliteProxy()
 * to avoid breaking Jest tests — the native module is only available at runtime on device.
 */

import {EntityMappingConfig} from "openchs-models";
import EncryptionService from "../../service/EncryptionService";
import _ from "lodash";
import SqliteProxy from "./SqliteProxy";
import DrizzleSchemaGenerator from "./DrizzleSchemaGenerator";
import Config from "../Config";
import InitialSettings from "../../../config/initialSettings.json";

const DB_NAME = "avni_sqlite.db";

class SqliteFactory {
    /**
     * Create a new SqliteProxy backed by op-sqlite.
     *
     * @returns {Promise<SqliteProxy>}
     */
    static async createSqliteProxy() {
        // Dynamic require to avoid breaking Jest (native module only available on device)
        const {open} = require("@op-engineering/op-sqlite");

        const entityMappingConfig = EntityMappingConfig.getInstance();

        // Generate schema metadata from Realm schemas
        const tableMetaMap = DrizzleSchemaGenerator.generateAll(entityMappingConfig);
        const realmSchemaMap = DrizzleSchemaGenerator.buildRealmSchemaMap(entityMappingConfig);

        // Open op-sqlite database
        // Note: For encryption, op-sqlite supports SQLCipher via the `encryptionKey` option
        const dbOptions = {name: DB_NAME};

        const encryptionKey = await EncryptionService.getEncryptionKey();
        if (!_.isNil(encryptionKey)) {
            // op-sqlite expects encryption key as a string
            // Realm uses a 64-byte Uint8Array; convert to hex string for SQLCipher
            if (encryptionKey instanceof Uint8Array || encryptionKey instanceof ArrayBuffer) {
                const bytes = encryptionKey instanceof ArrayBuffer
                    ? new Uint8Array(encryptionKey)
                    : encryptionKey;
                dbOptions.encryptionKey = Array.from(bytes)
                    .map(b => b.toString(16).padStart(2, "0"))
                    .join("");
            } else if (typeof encryptionKey === "string") {
                dbOptions.encryptionKey = encryptionKey;
            }
        }

        const db = open(dbOptions);

        // Enable WAL mode for better concurrent read/write performance
        // Note: op-sqlite's execute() is async; use executeSync() for synchronous operations
        db.executeSync("PRAGMA journal_mode = WAL");
        // TODO: Re-enable foreign key enforcement once flat INSERT handling is resolved.
        // FK enforcement temporarily disabled: Realm's db.create() auto-creates the entire
        // referenced object graph recursively, but our flat INSERT only stores FK UUIDs.
        db.executeSync("PRAGMA foreign_keys = OFF");

        // Create all tables
        const createStatements = DrizzleSchemaGenerator.generateCreateTableStatements(tableMetaMap);
        for (const sql of createStatements) {
            try {
                db.executeSync(sql);
            } catch (e) {
                console.error("SqliteFactory: Failed to create table:", sql, e);
                throw e;
            }
        }

        // Create indexes
        const indexStatements = DrizzleSchemaGenerator.generateIndexStatements(tableMetaMap);
        for (const sql of indexStatements) {
            try {
                db.executeSync(sql);
            } catch (e) {
                console.warn("SqliteFactory: Failed to create index:", sql, e.message);
                // Non-fatal — continue
            }
        }

        console.log(`SqliteFactory: Database initialized with ${tableMetaMap.size} tables`);

        // Seed Settings row if it doesn't exist.
        // SettingsService.init() is async (uses AsyncStorage) but BeanRegistry.init() doesn't
        // await it, so on a fresh database Settings must exist before services initialize.
        const settingsTable = tableMetaMap.get("Settings");
        if (settingsTable) {
            const existing = db.executeSync(`SELECT "uuid" FROM ${settingsTable.tableName} LIMIT 1`);
            if (!existing.rows || existing.rows.length === 0) {
                const settingsUuid = "2aa81079-38c3-4d9f-8380-f50544b32b3d"; // Settings.UUID
                const serverURL = Config.SERVER_URL || "https://app.avniproject.org";
                db.executeSync(
                    `INSERT INTO ${settingsTable.tableName} ("uuid", "server_url", "log_level", "page_size", "pool_id", "client_id", "dev_skip_validation", "capture_location") VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    [settingsUuid, serverURL, InitialSettings.logLevel, InitialSettings.pageSize, "", Config.CLIENT_ID || "", 0, 1]
                );
                console.log("SqliteFactory: Seeded initial Settings row");
            }
        }

        return new SqliteProxy(db, entityMappingConfig, tableMetaMap, realmSchemaMap);
    }

    /**
     * Get the database file path.
     */
    static getDbPath() {
        return DB_NAME;
    }
}

export default SqliteFactory;
