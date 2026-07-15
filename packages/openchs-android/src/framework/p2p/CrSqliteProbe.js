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

    _rows(result) {
        return result.rows._array || result.rows || [];
    }
}

export default new CrSqliteProbe();
