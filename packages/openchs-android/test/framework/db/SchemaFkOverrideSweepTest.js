/**
 * Static sweep over the real Realm schemas to verify that every list property whose
 * child schema has multiple FK columns pointing back at the parent type is
 * disambiguated in EXPLICIT_LIST_FK_OVERRIDES.
 *
 * This is the test the AddressLevel.locationMappings bug would have surfaced
 * automatically: LocationMapping has two FKs (parent_uuid, child_uuid) both
 * pointing at AddressLevel, so the parent's `locationMappings` list property
 * is ambiguous unless EXPLICIT_LIST_FK_OVERRIDES names which FK is the
 * back-reference.
 *
 * Run: npx jest test/framework/db/SchemaFkOverrideSweepTest.js --verbose
 */

import {EntityMappingConfig} from 'openchs-models';
import {EXPLICIT_LIST_FK_OVERRIDES} from '../../../src/framework/db/EntityHydrator';

describe('EXPLICIT_LIST_FK_OVERRIDES sweep over real schemas', () => {
    it('covers every multi-FK back-reference among list properties', () => {
        const schemas = EntityMappingConfig.getInstance().getRealmConfig().schema;
        const schemaByName = new Map(schemas.map(s => [s.name, s]));

        const missing = [];
        for (const parent of schemas) {
            for (const [propName, propDef] of Object.entries(parent.properties || {})) {
                if (typeof propDef !== 'object' || propDef.type !== 'list') continue;

                const childName = propDef.objectType;
                const child = schemaByName.get(childName);
                if (!child) continue;

                const fksToParent = Object.values(child.properties || {})
                    .filter(p => typeof p === 'object' && p.type === 'object' && p.objectType === parent.name);

                if (fksToParent.length > 1) {
                    const key = `${parent.name}.${propName}`;
                    if (!EXPLICIT_LIST_FK_OVERRIDES[key]) {
                        missing.push({key, fkCount: fksToParent.length, childSchema: childName});
                    }
                }
            }
        }

        if (missing.length > 0) {
            const lines = missing.map(m =>
                `  - ${m.key} → ${m.childSchema} has ${m.fkCount} FK columns pointing at ${m.key.split('.')[0]}`);
            throw new Error(
                `Missing EXPLICIT_LIST_FK_OVERRIDES entries (EntityHydrator.js). ` +
                `Each list below resolves to an ambiguous back-reference without an explicit FK override, ` +
                `which produces wrong results during hydration (see AddressLevel.locationMappings for a ` +
                `real incident):\n${lines.join('\n')}`
            );
        }
    });
});
