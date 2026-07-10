#!/usr/bin/env node
// Offline encryption CLI for edge-model provisioning.
//
// Reads a plaintext model file (.pt / .tflite / .onnx / ...), encrypts it with a fresh
// AES-GCM-256 key + IV, and emits provisioning artefacts into a staging dir that is never
// part of the APK:
//
//   <staging>/<sha256OfPlaintext>.bin   [12-byte IV][ciphertext][16-byte GCM tag]
//   <staging>/manifest.json             downloadable-content reference-data items (no secrets)
//   <staging>/keys.json                 sha256 -> base64 AES key (for the server key store only)
//
// The blob is content-addressed by the sha256 of the PLAINTEXT: it is the object key
// (models/<sha256>.bin), the device cache key, the key-store key, and the post-decrypt
// integrity check. Nothing here ships in the binary — ops upload the blobs to the org's
// GCS models/ prefix, create the reference-data items, and load the keys into the server
// key store.

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const GCM_IV_BYTES = 12;            // 96-bit IV — recommended for GCM
const KEY_BYTES = 32;               // AES-256
const MODEL_NAMESPACE = 'models';   // object-key prefix that routes to the MODEL storage backend
const DEFAULT_CATEGORY = 'edgeModel';

function parseArgs(argv) {
    const args = {};
    for (let i = 2; i < argv.length; i++) {
        const k = argv[i];
        if (!k.startsWith('--')) continue;
        const key = k.slice(2);
        const v = argv[i + 1];
        if (v === undefined || v.startsWith('--')) {
            args[key] = true;
        } else {
            args[key] = v;
            i++;
        }
    }
    return args;
}

function usage(msg) {
    if (msg) console.error(`error: ${msg}\n`);
    console.error('Usage: node encrypt-model.js --in <plaintext> --staging-dir <dir> --name <model-name> [--override <override.json>] [--category <category>]');
    process.exit(1);
}

function loadJsonOrInit(file, fallback) {
    if (!fs.existsSync(file)) return fallback;
    try {
        return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (e) {
        process.stderr.write(`[encrypt] warning: ${path.basename(file)} is malformed, replacing\n`);
        return fallback;
    }
}

function main() {
    const args = parseArgs(process.argv);
    // A flag given with no value parses to boolean true; require a real string for each.
    for (const flag of ['in', 'staging-dir', 'name']) {
        if (typeof args[flag] !== 'string') usage(`--${flag} requires a value`);
    }
    for (const flag of ['override', 'category']) {
        if (flag in args && typeof args[flag] !== 'string') usage(`--${flag} requires a value`);
    }

    const inPath = path.resolve(args.in);
    const stagingDir = path.resolve(args['staging-dir']);
    const name = args.name;
    const category = args.category || DEFAULT_CATEGORY;
    const overridePath = args.override ? path.resolve(args.override) : null;

    if (!fs.existsSync(inPath)) usage(`input file not found: ${inPath}`);
    if (overridePath && !fs.existsSync(overridePath)) usage(`override file not found: ${overridePath}`);

    // Parse the override before writing anything, so a malformed override fails cleanly
    // rather than leaving an orphan blob with no manifest entry or key.
    let payload = {};
    if (overridePath) {
        try {
            payload = JSON.parse(fs.readFileSync(overridePath, 'utf8'));
        } catch (e) {
            usage(`override file is not valid JSON: ${overridePath} (${e.message})`);
        }
    }

    fs.mkdirSync(stagingDir, { recursive: true });

    const plaintext = fs.readFileSync(inPath);
    const sha256 = crypto.createHash('sha256').update(plaintext).digest('hex');

    const key = crypto.randomBytes(KEY_BYTES);
    const iv = crypto.randomBytes(GCM_IV_BYTES);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const authTag = cipher.getAuthTag();

    // On-disk layout [IV (12)][ciphertext][auth tag (16)] — matches the native decrypt in EdgeModelModule.
    const blob = Buffer.concat([iv, ciphertext, authTag]);
    const blobName = `${sha256}.bin`;
    fs.writeFileSync(path.join(stagingDir, blobName), blob);

    const item = {
        name,
        category,
        sha256,
        contentKey: `${MODEL_NAMESPACE}/${blobName}`,
        needsKey: true,
        payload,
        blob: blobName,
    };

    // manifest.json carries the reference-data items + which blob each maps to. Content-addressed,
    // so re-encrypting the same plaintext replaces the entry for that sha rather than duplicating it.
    const manifestPath = path.join(stagingDir, 'manifest.json');
    const manifest = loadJsonOrInit(manifestPath, { items: [] });
    manifest.items = (manifest.items || []).filter(i => i.sha256 !== sha256);
    manifest.items.push(item);
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');

    // keys.json is the only place the AES key lives — it goes to the server key store, never to GCS,
    // never into the APK, never onto the reference-data record. Kept separate from manifest.json so
    // the manifest can be handled (and inspected) without exposing key material.
    const keysPath = path.join(stagingDir, 'keys.json');
    const keys = loadJsonOrInit(keysPath, {});
    keys[sha256] = key.toString('base64');
    fs.writeFileSync(keysPath, JSON.stringify(keys, null, 2) + '\n');

    process.stderr.write(`[encrypt] in=${inPath} (${plaintext.length} bytes)\n`);
    process.stderr.write(`[encrypt] staged ${blobName} (${blob.length} bytes) -> contentKey=${item.contentKey}\n`);
    process.stderr.write(`[encrypt] name=${name} category=${category} sha256=${sha256} needsKey=true\n`);
    process.stderr.write(`[encrypt] manifest=${manifestPath}\n`);
    process.stderr.write(`[encrypt] keys.json holds the AES key for the server key store — never commit it, never upload it to GCS.\n`);
    process.stderr.write(`[encrypt] done.\n`);
}

if (require.main === module) {
    main();
}

module.exports = { main, MODEL_NAMESPACE, DEFAULT_CATEGORY };
