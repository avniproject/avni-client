#!/usr/bin/env node
// Generates prop-schema-map.json: list/linkingObjects property name -> element schema
// name(s), from the openchs-models version pinned by this checkout. Used by
// extract_client_corpus.py to infer the root schema of chained receivers like
// `individual.encounters.filtered(...)`.
//
//   node scripts/query-census/dump-prop-schema-map.mjs
import fs from "node:fs";
import path from "node:path";
import {createRequire} from "node:module";
import {fileURLToPath} from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(here, "..", "..", "package.json"));
const {EntityMappingConfig} = require("openchs-models");

const schemas = EntityMappingConfig.getInstance().getRealmConfig().schema;
const propMap = {};
for (const s of schemas) {
    const raw = s && s.properties ? s : (s && s.schema ? s.schema : s);
    if (!raw || !raw.properties) continue;
    for (const [prop, def] of Object.entries(raw.properties)) {
        let target = null;
        if (typeof def === "object" && (def.type === "list" || def.type === "linkingObjects") && def.objectType) {
            target = def.objectType;
        } else if (typeof def === "string" && def.endsWith("[]")) {
            target = def.slice(0, -2);
        }
        if (target) {
            propMap[prop] = propMap[prop] || {};
            propMap[prop][target] = (propMap[prop][target] || 0) + 1;
        }
    }
}

const out = path.join(here, "prop-schema-map.json");
fs.writeFileSync(out, JSON.stringify(propMap, null, 1));
console.log(`${Object.keys(propMap).length} properties -> ${out}`);
