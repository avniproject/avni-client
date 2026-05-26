#!/usr/bin/env node
// Generate the tanuh launcher icons (home-screen + Android 12+ system splash)
// from TANUH.svg.
//
// Two artwork variants are derived from the source SVG:
//
//   "full"   — full rasterisation (TANUH symbol + the vector "TANUH" wordmark).
//              Used for the square legacy launcher (openchs_launcher.png),
//              where the rectangle is wide enough to fit the text without
//              clipping.
//
//   "symbol" — embedded-PNG extraction only (the hex/network/cross symbol
//              with NO wordmark). Used for the round legacy launcher and the
//              adaptive-icon foreground. The Android 12+ system splash also
//              renders the adaptive foreground, so the wordmark must NOT be
//              there — otherwise the circular mask clips the text and the
//              splash looks broken (this was the user-reported regression).
//
// Adaptive icon foreground safe zone: inner ~66dp of the 108dp canvas.
// Symbol artwork is sized to ~60% of canvas to leave breathing margin.
// Legacy square uses 80% (small inset, no wordmark clipping risk).
// Legacy round symbol uses 70% (symbol fits comfortably in the circle).
//
// Requires sharp (one-off): npm install --no-save sharp in tools/.

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import sharp from "sharp";

const SVG_PATH = path.join(os.homedir(), "Avni/Tanuh/tanuh_logos/TANUH.svg");
const RES_DIR  = path.resolve("packages/openchs-android/android/app/src/tanuh/res");

const DENSITIES = [
    { name: "mdpi",    legacy: 48,  adaptive: 108 },
    { name: "hdpi",    legacy: 72,  adaptive: 162 },
    { name: "xhdpi",   legacy: 96,  adaptive: 216 },
    { name: "xxhdpi",  legacy: 144, adaptive: 324 },
    { name: "xxxhdpi", legacy: 192, adaptive: 432 },
];

const SQUARE_INNER_FRAC   = 0.80; // square legacy: symbol + wordmark fits with 10% inset
const ROUND_INNER_FRAC    = 0.70; // round legacy: symbol-only, larger inner inset
const ADAPTIVE_INNER_FRAC = 0.60; // adaptive foreground: fits Android's 66/108 safe zone

async function trimmedFull() {
    return sharp(fs.readFileSync(SVG_PATH), { density: 300 }).trim().png().toBuffer();
}

// Symbol-only variant: same SVG with the "TANUH" wordmark stripped.
// In TANUH.svg the 3 symbol paths carry class="cls-X" and the 5 wordmark
// letter paths have no class attribute — so removing classless <path d=…/>
// elements isolates the symbol cleanly without breaking any vector groups.
async function trimmedSymbol() {
    const svgText = fs.readFileSync(SVG_PATH, "utf8");
    const symbolOnly = svgText.replace(/<path\s+d="[^"]*"\s*\/>/g, "");
    return sharp(Buffer.from(symbolOnly, "utf8"), { density: 300 }).trim().png().toBuffer();
}

async function buildIcon({ artworkBuf, canvas, innerFrac, background }) {
    const inner = Math.round(canvas * innerFrac);
    const fitted = await sharp(artworkBuf)
        .resize({ width: inner, height: inner, fit: "inside", withoutEnlargement: false })
        .toBuffer({ resolveWithObject: true });
    const left = Math.floor((canvas - fitted.info.width)  / 2);
    const top  = Math.floor((canvas - fitted.info.height) / 2);
    return sharp({
        create: { width: canvas, height: canvas, channels: 4, background },
    })
        .composite([{ input: fitted.data, left, top }])
        .png()
        .toBuffer();
}

async function main() {
    const fullBuf   = await trimmedFull();
    const symbolBuf = await trimmedSymbol();

    for (const d of DENSITIES) {
        const dir = path.join(RES_DIR, `mipmap-${d.name}`);
        fs.mkdirSync(dir, { recursive: true });

        // Square legacy: symbol + wordmark on white background.
        const square = await buildIcon({
            artworkBuf: fullBuf,
            canvas: d.legacy,
            innerFrac: SQUARE_INNER_FRAC,
            background: { r: 255, g: 255, b: 255, alpha: 1 },
        });
        fs.writeFileSync(path.join(dir, "openchs_launcher.png"), square);

        // Round legacy: symbol only on white background (no wordmark clipping).
        const round = await buildIcon({
            artworkBuf: symbolBuf,
            canvas: d.legacy,
            innerFrac: ROUND_INNER_FRAC,
            background: { r: 255, g: 255, b: 255, alpha: 1 },
        });
        fs.writeFileSync(path.join(dir, "openchs_launcher_round.png"), round);

        // Adaptive foreground: symbol only on transparent canvas — drives both
        // the adaptive icon shape and the Android 12+ system splash.
        const foreground = await buildIcon({
            artworkBuf: symbolBuf,
            canvas: d.adaptive,
            innerFrac: ADAPTIVE_INNER_FRAC,
            background: { r: 0, g: 0, b: 0, alpha: 0 },
        });
        fs.writeFileSync(path.join(dir, "openchs_launcher_foreground.png"), foreground);

        console.log(`mipmap-${d.name}: square+round ${d.legacy}px, foreground ${d.adaptive}px`);
    }
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
