'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const SCRIPT = path.join(__dirname, 'encrypt-model.js');
const GCM_IV_BYTES = 12;
const GCM_TAG_BYTES = 16;

function makeWorkspace() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'encrypt-model-'));
    const staging = path.join(dir, 'staging');
    return { dir, staging };
}

function writePlaintext(dir, name, bytes) {
    const p = path.join(dir, name);
    fs.writeFileSync(p, bytes);
    return p;
}

function run(args) {
    execFileSync('node', [SCRIPT, ...args], { stdio: 'pipe' });
}

function sha256Hex(buf) {
    return crypto.createHash('sha256').update(buf).digest('hex');
}

function decrypt(blob, base64Key) {
    const iv = blob.subarray(0, GCM_IV_BYTES);
    const tag = blob.subarray(blob.length - GCM_TAG_BYTES);
    const ciphertext = blob.subarray(GCM_IV_BYTES, blob.length - GCM_TAG_BYTES);
    const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(base64Key, 'base64'), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

test('blob is named by the plaintext sha256 and staged, not bundled', () => {
    const { dir, staging } = makeWorkspace();
    const plaintext = crypto.randomBytes(4096);
    const inPath = writePlaintext(dir, 'model.onnx', plaintext);
    const sha = sha256Hex(plaintext);

    run(['--in', inPath, '--staging-dir', staging, '--name', 'fold-a']);

    assert.ok(fs.existsSync(path.join(staging, `${sha}.bin`)), 'blob named <sha256>.bin');
    assert.ok(!fs.existsSync(path.join(staging, 'registry.json')), 'no registry.json is produced');
});

test('manifest item carries the reference-data fields, no key material', () => {
    const { dir, staging } = makeWorkspace();
    const plaintext = crypto.randomBytes(2048);
    const inPath = writePlaintext(dir, 'model.onnx', plaintext);
    const override = path.join(dir, 'override.json');
    const payload = { engine: 'onnx', input: { preprocessor: 'p' }, output: { decoder: 'd' } };
    fs.writeFileSync(override, JSON.stringify(payload));
    const sha = sha256Hex(plaintext);

    run(['--in', inPath, '--staging-dir', staging, '--name', 'fold-a', '--override', override]);

    const manifest = JSON.parse(fs.readFileSync(path.join(staging, 'manifest.json'), 'utf8'));
    assert.strictEqual(manifest.items.length, 1);
    const item = manifest.items[0];
    assert.strictEqual(item.name, 'fold-a');
    assert.strictEqual(item.category, 'edgeModel');
    assert.strictEqual(item.sha256, sha);
    assert.strictEqual(item.contentKey, `models/${sha}.bin`);
    assert.strictEqual(item.needsKey, true);
    assert.deepStrictEqual(item.payload, payload);
    assert.strictEqual(JSON.stringify(item).includes('encryptionKey'), false, 'no key on the item');
    assert.ok(!('encryptionKey' in item) && !('key' in item) && !('base64Key' in item));
});

test('keys.json maps sha256 to the AES key that decrypts the blob to the original plaintext', () => {
    const { dir, staging } = makeWorkspace();
    const plaintext = crypto.randomBytes(8192);
    const inPath = writePlaintext(dir, 'model.onnx', plaintext);
    const sha = sha256Hex(plaintext);

    run(['--in', inPath, '--staging-dir', staging, '--name', 'fold-a']);

    const keys = JSON.parse(fs.readFileSync(path.join(staging, 'keys.json'), 'utf8'));
    assert.ok(keys[sha], 'key stored under the plaintext sha256');

    const blob = fs.readFileSync(path.join(staging, `${sha}.bin`));
    const recovered = decrypt(blob, keys[sha]);
    assert.ok(recovered.equals(plaintext), 'blob decrypts back to the exact plaintext');
});

test('multiple models accumulate into one manifest + keys file', () => {
    const { dir, staging } = makeWorkspace();
    const a = writePlaintext(dir, 'a.onnx', crypto.randomBytes(1024));
    const b = writePlaintext(dir, 'b.onnx', crypto.randomBytes(1024));

    run(['--in', a, '--staging-dir', staging, '--name', 'fold-a']);
    run(['--in', b, '--staging-dir', staging, '--name', 'fold-b']);

    const manifest = JSON.parse(fs.readFileSync(path.join(staging, 'manifest.json'), 'utf8'));
    const keys = JSON.parse(fs.readFileSync(path.join(staging, 'keys.json'), 'utf8'));
    assert.strictEqual(manifest.items.length, 2);
    assert.strictEqual(Object.keys(keys).length, 2);
    assert.deepStrictEqual(manifest.items.map(i => i.name).sort(), ['fold-a', 'fold-b']);
});

test('re-encrypting the same plaintext replaces its entry rather than duplicating it', () => {
    const { dir, staging } = makeWorkspace();
    const plaintext = crypto.randomBytes(1024);
    const inPath = writePlaintext(dir, 'model.onnx', plaintext);
    const sha = sha256Hex(plaintext);

    run(['--in', inPath, '--staging-dir', staging, '--name', 'fold-a']);
    const firstKey = JSON.parse(fs.readFileSync(path.join(staging, 'keys.json'), 'utf8'))[sha];
    run(['--in', inPath, '--staging-dir', staging, '--name', 'fold-a']);

    const manifest = JSON.parse(fs.readFileSync(path.join(staging, 'manifest.json'), 'utf8'));
    const secondKey = JSON.parse(fs.readFileSync(path.join(staging, 'keys.json'), 'utf8'))[sha];
    assert.strictEqual(manifest.items.filter(i => i.sha256 === sha).length, 1, 'one entry per sha');
    assert.notStrictEqual(firstKey, secondKey, 'a fresh key is generated each run');
});

test('exits non-zero when required args are missing', () => {
    const { staging } = makeWorkspace();
    assert.throws(() => run(['--staging-dir', staging, '--name', 'x']), /Command failed|status/);
});

test('exits non-zero when --name is given with no value (not coerced to "true")', () => {
    const { dir, staging } = makeWorkspace();
    const inPath = writePlaintext(dir, 'model.onnx', crypto.randomBytes(512));
    assert.throws(() => run(['--in', inPath, '--staging-dir', staging, '--name']), /Command failed|status/);
});

test('--category overrides the default and no override yields an empty payload', () => {
    const { dir, staging } = makeWorkspace();
    const plaintext = crypto.randomBytes(512);
    const inPath = writePlaintext(dir, 'model.onnx', plaintext);
    const sha = sha256Hex(plaintext);

    run(['--in', inPath, '--staging-dir', staging, '--name', 'fold-a', '--category', 'sharedModel']);

    const item = JSON.parse(fs.readFileSync(path.join(staging, 'manifest.json'), 'utf8'))
        .items.find(i => i.sha256 === sha);
    assert.strictEqual(item.category, 'sharedModel');
    assert.deepStrictEqual(item.payload, {});
});

test('a malformed override fails cleanly and leaves no orphan blob', () => {
    const { dir, staging } = makeWorkspace();
    const plaintext = crypto.randomBytes(512);
    const inPath = writePlaintext(dir, 'model.onnx', plaintext);
    const override = path.join(dir, 'bad.json');
    fs.writeFileSync(override, '{ not valid json');
    const sha = sha256Hex(plaintext);

    assert.throws(() => run(['--in', inPath, '--staging-dir', staging, '--name', 'fold-a', '--override', override]), /Command failed|status/);
    assert.ok(!fs.existsSync(path.join(staging, `${sha}.bin`)), 'no blob written when the override is bad');
    assert.ok(!fs.existsSync(path.join(staging, 'manifest.json')), 'no manifest written when the override is bad');
});
