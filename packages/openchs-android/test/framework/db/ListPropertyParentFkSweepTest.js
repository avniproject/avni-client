/**
 * Static sweep asserting that every list property the SQLite layer resolves via a
 * CHILD TABLE has a reconstructable, unambiguous back-reference to its parent —
 * i.e. that `parent.<listProp>` can be rebuilt after a write/hydrate round-trip.
 *
 * It drives off the real generated schema (SchemaGenerator), so it understands
 * how each list is actually stored:
 *
 *   - COLUMN-STORED lists (embedded objects as JSON today; a JSON array of child
 *     UUIDs once the many-to-many fix lands) live on the parent row and need no
 *     child FK. These are NOT in TableMeta.listProperties, so they're skipped
 *     automatically — when an M2M list is migrated to a JSON-array column it
 *     drops out of this sweep without any allowlist edit.
 *
 *   - CHILD-TABLE lists (TableMeta.listProperties) are resolved by querying a
 *     child table on a parent FK. These are the ones checked here, for the two
 *     failure modes SchemaFkOverrideSweepTest is blind to:
 *       1. ZERO parent FK on the child (and no override) → resolveList returns [].
 *          (EntityApprovalStatus, ReportCard inputs, TaskType.metadataSearchFields,
 *          Family.members, primitive string[] lists.)
 *       2. ROLE-CONFUSION — exactly one parent-typed FK, so the multi-FK sweep
 *          passes, but it points elsewhere. Concept.answers: ConceptAnswer.concept
 *          is the answer, not the question.
 *
 * Tracking issue: avniproject/avni-client#1955. Expected RED until each listed
 * relationship is fixed (child parent-FK column + override + resync, a
 * generic-link override, a JSON-array column, or a join table). Each fix removes
 * one line from the failure.
 */

import {EntityMappingConfig} from 'openchs-models';
import {EXPLICIT_LIST_FK_OVERRIDES} from '../../../src/framework/db/EntityHydrator';
import {SchemaGenerator} from '../../../src/framework/db/SchemaGenerator';

// Single-FK list properties whose one parent-typed FK is semantically NOT the
// parent. Cannot be detected statically (the type matches the parent), so it is
// recorded here from investigation. A fix must add an EXPLICIT_LIST_FK_OVERRIDES
// entry pointing at the real parent column; that flips the entry green.
const ROLE_CONFUSED_LIST_PROPS = new Set([
    'Concept.answers', // ConceptAnswer.concept = the answer option, not the question
]);

// Legacy list properties with no live sync path that populates them, so they are
// intentionally left unresolved (no storage column, no override). Family is a
// deprecated shim — nothing in EntityMetaData associates members to it.
const LEGACY_UNSYNCED_LIST_PROPS = new Set([
    'Family.members',
]);

describe('list-property parent back-reference sweep over real schemas (#1955)', () => {
    it('every child-table list property resolves an unambiguous parent FK', () => {
        const emc = EntityMappingConfig.getInstance();
        const schemaByName = new Map(emc.getRealmConfig().schema.map(s => [s.name, s]));
        const tableMetaMap = SchemaGenerator.generateAll(emc);

        const failures = [];
        for (const [parentName, tableMeta] of tableMetaMap) {
            // listProperties holds only CHILD-TABLE lists. Column-stored lists
            // (embedded JSON / JSON-UUID-array) are absent here → resolvable.
            for (const [propName, childName] of Object.entries(tableMeta.listProperties || {})) {
                const key = `${parentName}.${propName}`;

                // An explicit override names the back-reference column → resolvable.
                if (EXPLICIT_LIST_FK_OVERRIDES[key]) continue;

                // Legacy/unsynced — intentionally unresolved.
                if (LEGACY_UNSYNCED_LIST_PROPS.has(key)) continue;

                const child = schemaByName.get(childName);
                if (!child) {
                    // No child schema (e.g. string[]). Not column-stored and no child
                    // table to resolve against → must move to a JSON-array column.
                    failures.push({key, reason: `primitive list (${childName}[]) — not column-stored and has no child table; needs a JSON-array column`});
                    continue;
                }

                const parentFks = Object.entries(child.properties || {})
                    .filter(([, p]) => typeof p === 'object' && p.type === 'object' && p.objectType === parentName)
                    .map(([cp]) => cp);

                if (ROLE_CONFUSED_LIST_PROPS.has(key)) {
                    failures.push({key, reason: `single FK '${parentFks[0]}' on ${childName} is not the parent — needs override to the real parent column`});
                } else if (parentFks.length === 0) {
                    failures.push({key, reason: `${childName} has no FK back to ${parentName} — needs a parent column + override, a generic-link override, a JSON-array column, or a join table`});
                } else if (parentFks.length > 1) {
                    failures.push({key, reason: `${childName} has ${parentFks.length} FKs to ${parentName} (${parentFks.join(', ')}) — ambiguous, needs override`});
                }
                // exactly one parent-typed FK and not role-confused → resolvable.
            }
        }

        if (failures.length > 0) {
            const lines = failures
                .sort((a, b) => a.key.localeCompare(b.key))
                .map(f => `  - ${f.key}: ${f.reason}`);
            throw new Error(
                `${failures.length} child-table list propert${failures.length === 1 ? 'y' : 'ies'} cannot reconstruct ` +
                `their parent→child relationship in SQLite. Each returns [] (or throws) when accessed via the parent, ` +
                `silently dropping data. Fix incrementally under avniproject/avni-client#1955:\n${lines.join('\n')}`
            );
        }
    });
});
