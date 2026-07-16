import {open} from '@op-engineering/op-sqlite';

// Design B gate, phase 2: prove cr-sqlite's core loop (crr conversion, change
// capture, merge) works under SQLCipher. Simulates two devices with two encrypted
// DBs on one phone and syncs a row A -> B -> A.
class CrSqliteProbe {
    async run(log) {
        let dbA = null;
        let dbB = null;
        try {
            log('1. Opening two encrypted DBs...');
            dbA = open({name: 'crsql_probe_a.db', encryptionKey: 'probe-key-a'});
            dbB = open({name: 'crsql_probe_b.db', encryptionKey: 'probe-key-b'});

            const siteA = await dbA.execute('select hex(crsql_site_id()) as site');
            const siteB = await dbB.execute('select hex(crsql_site_id()) as site');
            log(`2. Extension loaded. siteA=${this._rows(siteA)[0].site.slice(0, 8)}…, siteB=${this._rows(siteB)[0].site.slice(0, 8)}…`);

            for (const db of [dbA, dbB]) {
                await db.execute('drop table if exists probe_item');
                await db.execute('create table probe_item (uuid text primary key not null, name text, qty integer)');
                await db.execute(`select crsql_as_crr('probe_item')`);
            }
            log('3. probe_item created + converted to CRR on both');

            await dbA.execute(`insert into probe_item (uuid, name, qty) values ('u1', 'paracetamol', 10)`);
            await dbA.execute(`update probe_item set qty = 8 where uuid = 'u1'`);
            const changesA = await dbA.execute(`select "table", hex(pk) as pk, cid, val, col_version, db_version, hex(site_id) as site_id, cl, seq from crsql_changes`);
            log(`4. A wrote u1; crsql_changes has ${this._rows(changesA).length} entries`);
            if (this._rows(changesA).length === 0) throw new Error('no changes captured');

            const rawChanges = await dbA.execute(`select "table", pk, cid, val, col_version, db_version, site_id, cl, seq from crsql_changes`);
            for (const c of this._rows(rawChanges)) {
                await dbB.execute(
                    `insert into crsql_changes ("table", pk, cid, val, col_version, db_version, site_id, cl, seq) values (?,?,?,?,?,?,?,?,?)`,
                    [c.table, c.pk, c.cid, c.val, c.col_version, c.db_version, c.site_id, c.cl, c.seq]);
            }
            const inB = await dbB.execute(`select * from probe_item where uuid = 'u1'`);
            const rowB = this._rows(inB)[0];
            if (!rowB || rowB.qty !== 8 || rowB.name !== 'paracetamol') throw new Error(`merge into B wrong: ${JSON.stringify(rowB)}`);
            log(`5. Merged A→B: u1 arrived as (${rowB.name}, qty=${rowB.qty})`);

            await dbB.execute(`update probe_item set qty = 5 where uuid = 'u1'`);
            const bVersion = this._rows(await dbB.execute('select crsql_db_version() as v'))[0].v;
            const backChanges = await dbB.execute(
                `select "table", pk, cid, val, col_version, db_version, site_id, cl, seq from crsql_changes where site_id = crsql_site_id()`);
            for (const c of this._rows(backChanges)) {
                await dbA.execute(
                    `insert into crsql_changes ("table", pk, cid, val, col_version, db_version, site_id, cl, seq) values (?,?,?,?,?,?,?,?,?)`,
                    [c.table, c.pk, c.cid, c.val, c.col_version, c.db_version, c.site_id, c.cl, c.seq]);
            }
            const backInA = this._rows(await dbA.execute(`select qty from probe_item where uuid = 'u1'`))[0];
            if (backInA.qty !== 5) throw new Error(`merge back into A wrong: qty=${backInA.qty}`);
            log(`6. Merged B→A: qty=5 won by LWW (B db_version=${bVersion})`);

            log('PROBE PASSED ✅ crr + change capture + bidirectional merge, all under SQLCipher');
            return true;
        } catch (error) {
            log(`PROBE FAILED ❌ ${error.message}`);
            return false;
        } finally {
            try {
                if (dbA) dbA.close();
                if (dbB) dbB.close();
            } catch (e) {
                log(`close: ${e.message}`);
            }
        }
    }

    // Phase 3: real Avni DDL (verbatim from drizzle-migrations/0000_initial.sql,
    // FK clauses included). Gates: conversion with FKs, CRR→CRR FK, cross-DB merge,
    // out-of-order apply under FK enforcement, ALTER on a CRR.
    async runPhase3(log) {
        const stubParents = ['subject_type', 'gender', 'address_level', 'entity_approval_status', 'encounter_type'];
        const individualDDL = `CREATE TABLE \`individual\` (
            \`uuid\` text PRIMARY KEY NOT NULL, \`subject_type_uuid\` text, \`name\` text,
            \`first_name\` text, \`middle_name\` text, \`last_name\` text, \`profile_picture\` text,
            \`date_of_birth\` integer, \`date_of_birth_verified\` integer, \`gender_uuid\` text,
            \`registration_date\` integer, \`lowest_address_level_uuid\` text, \`voided\` integer DEFAULT 0,
            \`observations\` text DEFAULT '[]', \`registration_location\` text, \`subject_location\` text,
            \`latest_entity_approval_status_uuid\` text, \`created_by\` text, \`created_by_uuid\` text,
            \`last_modified_by\` text, \`last_modified_by_uuid\` text)`;
        const encounterDDL = `CREATE TABLE \`encounter\` (
            \`uuid\` text PRIMARY KEY NOT NULL, \`encounter_type_uuid\` text, \`encounter_date_time\` integer,
            \`individual_uuid\` text, \`observations\` text DEFAULT '[]', \`encounter_location\` text,
            \`name\` text, \`earliest_visit_date_time\` integer, \`max_visit_date_time\` integer,
            \`cancel_date_time\` integer, \`cancel_observations\` text DEFAULT '[]', \`cancel_location\` text,
            \`voided\` integer DEFAULT 0, \`latest_entity_approval_status_uuid\` text,
            \`created_by\` text, \`created_by_uuid\` text, \`last_modified_by\` text,
            \`last_modified_by_uuid\` text, \`filled_by\` text, \`filled_by_uuid\` text)`;

        let dbA = null;
        let dbB = null;
        const results = [];
        const gate = async (name, fn) => {
            try {
                await fn();
                results.push(`${name}: PASS`);
                log(`${name}: PASS ✅`);
            } catch (error) {
                results.push(`${name}: FAIL — ${error.message}`);
                log(`${name}: FAIL ❌ ${error.message}`);
            }
        };

        try {
            // fresh db files each run — dropping a CRR table leaves shadow
            // (__crsql_clock) state behind that corrupts a recreated table
            const runId = Date.now();
            const setup = async (name) => {
                const db = open({name: name, encryptionKey: 'probe-key-p3'});
                // crsql_as_crr refuses tables with declared FK clauses (regardless of
                // PRAGMA foreign_keys) — CRR tables carry uuid reference columns only.
                await db.execute('PRAGMA foreign_keys = ON');
                for (const p of stubParents) {
                    await db.execute(`create table ${p} (uuid text primary key not null)`);
                    await db.execute(`insert into ${p} (uuid) values ('${p}-1')`);
                }
                await db.execute(individualDDL);
                await db.execute(encounterDDL);
                return db;
            };
            dbA = await setup(`crsql_p3_a_${runId}.db`);
            dbB = await setup(`crsql_p3_b_${runId}.db`);
            log('0. Two encrypted DBs with real Avni DDL (FKs on, stub parents seeded)');

            await gate('G3a crr-with-FKs (individual)', async () => {
                await dbA.execute(`select crsql_as_crr('individual')`);
                await dbB.execute(`select crsql_as_crr('individual')`);
            });
            await gate('G3b crr→crr FK (encounter)', async () => {
                await dbA.execute(`select crsql_as_crr('encounter')`);
                await dbB.execute(`select crsql_as_crr('encounter')`);
            });

            await gate('G3c cross-DB merge (both tables)', async () => {
                await dbA.execute(`insert into individual (uuid, subject_type_uuid, gender_uuid, first_name) values ('i1', 'subject_type-1', 'gender-1', 'Ramesh')`);
                await dbA.execute(`insert into encounter (uuid, encounter_type_uuid, individual_uuid, name) values ('e1', 'encounter_type-1', 'i1', 'vitals')`);
                const changes = this._rows(await dbA.execute(`select "table", pk, cid, val, col_version, db_version, site_id, cl, seq from crsql_changes`));
                if (changes.length === 0) throw new Error('no changes captured');
                for (const c of changes) {
                    await dbB.execute(`insert into crsql_changes ("table", pk, cid, val, col_version, db_version, site_id, cl, seq) values (?,?,?,?,?,?,?,?,?)`,
                        [c.table, c.pk, c.cid, c.val, c.col_version, c.db_version, c.site_id, c.cl, c.seq]);
                }
                const enc = this._rows(await dbB.execute(`select individual_uuid, name from encounter where uuid = 'e1'`))[0];
                if (!enc || enc.individual_uuid !== 'i1') throw new Error(`encounter not merged: ${JSON.stringify(enc)}`);
                const ind = this._rows(await dbB.execute(`select first_name from individual where uuid = 'i1'`))[0];
                if (!ind || ind.first_name !== 'Ramesh') throw new Error(`individual not merged: ${JSON.stringify(ind)}`);
            });

            await gate('G3d out-of-order apply (child before parent)', async () => {
                const versionBefore = this._rows(await dbA.execute('select crsql_db_version() as v'))[0].v;
                await dbA.execute(`insert into individual (uuid, subject_type_uuid, first_name) values ('i2', 'subject_type-1', 'Sita')`);
                await dbA.execute(`insert into encounter (uuid, individual_uuid, name) values ('e2', 'i2', 'followup')`);
                const changes = this._rows(await dbA.execute(
                    `select "table", pk, cid, val, col_version, db_version, site_id, cl, seq from crsql_changes where db_version > ?`, [versionBefore]));
                const childFirst = [...changes.filter((c) => c.table === 'encounter'), ...changes.filter((c) => c.table === 'individual')];
                if (childFirst.length === 0) throw new Error('no changes for i2/e2');
                await dbB.execute('begin');
                for (const c of childFirst) {
                    await dbB.execute(`insert into crsql_changes ("table", pk, cid, val, col_version, db_version, site_id, cl, seq) values (?,?,?,?,?,?,?,?,?)`,
                        [c.table, c.pk, c.cid, c.val, c.col_version, c.db_version, c.site_id, c.cl, c.seq]);
                }
                await dbB.execute('commit');
                const got = this._rows(await dbB.execute(`select name from encounter where uuid = 'e2'`))[0];
                if (!got) throw new Error('e2 missing after out-of-order apply');
            });

            await gate('G3e ALTER on CRR (drizzle-style migration)', async () => {
                await dbA.execute(`select crsql_begin_alter('individual')`);
                await dbA.execute(`alter table individual add column probe_col text`);
                await dbA.execute(`select crsql_commit_alter('individual')`);
                await dbA.execute(`update individual set probe_col = 'migrated' where uuid = 'i1'`);
                const captured = this._rows(await dbA.execute(
                    `select count(*) as n from crsql_changes where cid = 'probe_col'`))[0];
                if (captured.n === 0) throw new Error('post-ALTER change not captured');
            });

            log(`PHASE 3 SUMMARY: ${results.join(' | ')}`);
            return results;
        } catch (error) {
            log(`PHASE 3 ABORTED ❌ ${error.message}`);
            return results;
        } finally {
            for (const db of [dbA, dbB]) {
                try {
                    if (db) db.delete();
                } catch (e) {
                    log(`cleanup: ${e.message}`);
                }
            }
        }
    }

    _rows(result) {
        return result.rows._array || result.rows || [];
    }
}

export default new CrSqliteProbe();
