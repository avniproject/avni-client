#!/usr/bin/env node
// Compose the tanuh in-app logo + splash artwork from the new official
// brand asset at ~/Desktop/tanuh-ai-reference-logo.avif.
//
// Produces two identical PNGs under the tanuh flavor assets:
//
//   logo.png         — login / server-config / unhandled-error views
//   splash_logo.png  — App.js cold-start "splash" loading view, and (via
//                      the homePage.html WebView splash) the 3-second
//                      launch screen
//
// The source AVIF was designed for a dark teal backdrop — text and emblem
// outlines are rendered white-on-transparent. To make the artwork legible
// on the rest of the app's white surfaces, we tint the "white-ish"
// pixels to the brand teal `#1F4D4D` while preserving the colored TANUH
// symbol (network ring + cross) untouched. The result is teal text/emblem
// on a white background — works on any white surface.
//
// Requires sharp (installed via `cd tools && npm install --no-save sharp`).

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import sharp from "sharp";

const SRC = path.join(os.homedir(), "Desktop/tanuh-ai-reference-logo.avif");
const OUT_DIR = path.resolve("packages/openchs-android/android/app/src/tanuh/assets");

const OUTPUT_WIDTH = 1500;

// Brand teal used for the text/emblem outlines once they're tinted off white.
const TINT = { r: 0x1F, g: 0x4D, b: 0x4D };

// "White-ish" detection: all three channels above this AND chroma (max-min)
// below the gap threshold. Tuned so anti-aliased greys around white edges
// are still treated as white (giving smooth tint edges).
const WHITE_MIN_CHANNEL = 180;
const WHITE_CHROMA_GAP  = 30;

async function loadAndResize(buf) {
    return sharp(buf)
        .ensureAlpha()
        .resize({ width: OUTPUT_WIDTH, fit: "inside", withoutEnlargement: false })
        .png()
        .raw()
        .toBuffer({ resolveWithObject: true });
}

function tintWhitePixels(data) {
    // Mutates in place. data is RGBA, 4 bytes per pixel.
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
        if (a === 0) continue; // fully transparent → leave alone (white shows through)
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        if (min >= WHITE_MIN_CHANNEL && (max - min) <= WHITE_CHROMA_GAP) {
            // Preserve the original luminance ratio so anti-aliased edges
            // blend smoothly: less-bright "white-ish" pixels get a darker
            // tinted value, fully bright pixels get the exact TINT.
            const lum = (r + g + b) / (3 * 255); // 0..1
            data[i]     = Math.round(TINT.r * lum);
            data[i + 1] = Math.round(TINT.g * lum);
            data[i + 2] = Math.round(TINT.b * lum);
            // alpha preserved
        }
    }
}

async function main() {
    if (!fs.existsSync(SRC)) {
        console.error(`source not found: ${SRC}`);
        process.exit(1);
    }
    fs.mkdirSync(OUT_DIR, { recursive: true });

    const avifBuf = fs.readFileSync(SRC);
    const { data, info } = await loadAndResize(avifBuf);
    console.log(`source resized: ${info.width}x${info.height} (channels=${info.channels})`);

    tintWhitePixels(data);

    // Composite the tinted RGBA artwork onto an opaque white canvas.
    const tintedBuf = await sharp(data, { raw: info }).png().toBuffer();
    const final = await sharp({
        create: {
            width: info.width,
            height: info.height,
            channels: 4,
            background: { r: 255, g: 255, b: 255, alpha: 1 },
        },
    })
        .composite([{ input: tintedBuf, left: 0, top: 0 }])
        .png()
        .toBuffer();

    for (const name of ["logo.png", "splash_logo.png"]) {
        const p = path.join(OUT_DIR, name);
        fs.writeFileSync(p, final);
        console.log(`wrote ${p} (${info.width}x${info.height}, ${fs.statSync(p).size} bytes)`);
    }
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
