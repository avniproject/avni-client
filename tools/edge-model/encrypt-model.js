#!/usr/bin/env node
/**
 * encrypt-model.js — offline encryption CLI for TANUH edge-model integration.
 *
 * Format-agnostic: reads any plaintext model file (.pt / .tflite / .onnx / …), encrypts
 * with AES-GCM-256 using a fresh random key + IV, and emits artefacts into the tanuh
 * flavour's asset directory:
 *
 *   <out-dir>/<modelKey>.bin     — [12-byte IV][ciphertext][16-byte GCM tag]
 *   <out-dir>/registry.json      — registry entry for this model (key + sha256 + override)
 *
 * Both files are gitignored (see .gitignore). They live next to the model in the APK so
 * that model + contract travel together — see ~/.claude/plans/composed-tumbling-bachman.md.
 *
 * Honest security framing: encrypted blob + AES key shipping in the same APK is
 * obfuscation, not §5.1 protection — it defeats casual extraction (the plaintext model
 * is not in the APK) but not a determined reverse-engineer who reads the bundled key.
 * Acceptable for the interim gdrive-distribution flow until the proper
 * organisation_config-delivered key + S3 path lands.
 *
 * Usage:
 *   node encrypt-model.js \
 *     --in       tools/edge-model/source/mvit2_fold5_2_latest_traced.pt \
 *     --out-dir  packages/openchs-android/android/app/src/tanuh/assets/models \
 *     --model-key mvit2_fold5_2_latest_traced \
 *     [--override tools/edge-model/tanuh-mvit2-override.json] \
 *     [--default-model]
 *
 * The script is dependency-free — uses Node's built-in `crypto` and `fs`.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const GCM_IV_BYTES = 12;            // 96-bit IV — recommended for GCM
const KEY_BYTES = 32;               // AES-256

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
    console.error('Usage: node encrypt-model.js --in <plain.tflite> --out-dir <dir> --model-key <key> [--override <override.json>] [--default-model]');
    process.exit(1);
}

function main() {
    const args = parseArgs(process.argv);
    if (!args.in || !args['out-dir'] || !args['model-key']) {
        usage('--in, --out-dir, and --model-key are required');
    }

    const inPath = path.resolve(args.in);
    const outDir = path.resolve(args['out-dir']);
    const modelKey = args['model-key'];
    const overridePath = args.override ? path.resolve(args.override) : null;

    if (!fs.existsSync(inPath)) usage(`input file not found: ${inPath}`);
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    const plaintext = fs.readFileSync(inPath);
    process.stderr.write(`[encrypt] in=${inPath} (${plaintext.length} bytes)\n`);

    const key = crypto.randomBytes(KEY_BYTES);
    const iv = crypto.randomBytes(GCM_IV_BYTES);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const authTag = cipher.getAuthTag();

    // On-disk layout: [IV (12)] [ciphertext] [auth tag (16)]
    // Matches EdgeModelModule.decryptToDirectBuffer in the Kotlin side.
    const blob = Buffer.concat([iv, ciphertext, authTag]);
    const blobPath = path.join(outDir, `${modelKey}.bin`);
    fs.writeFileSync(blobPath, blob);
    process.stderr.write(`[encrypt] wrote ${blobPath} (${blob.length} bytes)\n`);

    const sha256 = crypto.createHash('sha256').update(plaintext).digest('hex');
    const base64Key = key.toString('base64');

    // Build the registry entry. Merge into existing registry.json if one is already there
    // (so multiple models can be added by running this script multiple times).
    const registryPath = path.join(outDir, 'registry.json');
    let registry = { models: {} };
    if (fs.existsSync(registryPath)) {
        try { registry = JSON.parse(fs.readFileSync(registryPath, 'utf8')); }
        catch (e) { process.stderr.write(`[encrypt] warning: existing registry.json is malformed, replacing\n`); }
    }

    const entry = {
        asset: {
            type: 'encrypted',
            path: `models/${modelKey}.bin`,
            encryptionKey: base64Key,
            sha256OfPlaintext: sha256,
        },
    };
    if (overridePath) {
        if (!fs.existsSync(overridePath)) usage(`override file not found: ${overridePath}`);
        entry.override = JSON.parse(fs.readFileSync(overridePath, 'utf8'));
    }
    registry.models = registry.models || {};
    registry.models[modelKey] = entry;
    if (args['default-model'] || !registry.defaultModel) {
        registry.defaultModel = modelKey;
    }
    fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2) + '\n');
    process.stderr.write(`[encrypt] wrote ${registryPath}\n`);

    // Record-keeping summary on stderr — useful if someone needs to recover the key from build logs.
    process.stderr.write(`[encrypt] modelKey=${modelKey} sha256=${sha256}\n`);
    process.stderr.write(`[encrypt] base64Key (now stored in registry.json) = ${base64Key}\n`);
    process.stderr.write(`[encrypt] done.\n`);
}

main();
