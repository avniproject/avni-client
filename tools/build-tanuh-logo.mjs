#!/usr/bin/env node
// Compose tanuh in-app logos from the three brand SVGs at
// ~/Avni/Tanuh/tanuh_logos/. Produces two outputs in the tanuh flavor assets:
//
//   logo.png         — login / server-config / unhandled-error views.
//                      TANUH + MoE side-by-side, NO IISc (user feedback:
//                      "too many logos on login").
//
//   splash_logo.png  — App.js cold-start "splash" loading view only.
//                      TANUH + MoE (NO IISc — user feedback after seeing it
//                      in-place: "IISc seems out of position, remove it").
//                      Kept as a separate asset from logo.png so the splash
//                      and login surfaces can diverge later without code
//                      churn.
//
// Sizing strategy: each input logo is resized to a TARGET HEIGHT so the two
// logos appear visually balanced even though their natural aspects differ —
// TANUH is a vertical lockup (symbol stacked over the "TANUH" wordmark,
// ~1:1 aspect after trim), MoE is a horizontal lockup (emblem + 2-line
// text, ~2.16:1 aspect after trim).
//
// Requires sharp (one-off): npm install --no-save sharp in tools/.

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import sharp from "sharp";

const SVG_DIR = path.join(os.homedir(), "Avni/Tanuh/tanuh_logos");
const OUT_DIR = path.resolve("packages/openchs-android/android/app/src/tanuh/assets");

// Canvas widths are tuned so the side-by-side row fits at the target
// height with comfortable padding. MoE.svg is naturally ~2.16:1 wide
// (1031.77/478.61) so a square canvas can't hold both at decent heights.
// Both logo.png and splash_logo.png currently share the same 2-logo banner
// composition. They remain separate files so the splash can evolve
// independently later without touching the 4 view files.
const CANVAS_W = 1500;
const CANVAS_H = 600;        // 2.5:1 banner aspect

// Target heights — same for TANUH+MoE so they appear visually balanced.
const TANUH_H = 400;
const MOE_H   = 400;

const ROW_GAP = 60;          // horizontal gap between TANUH and MoE

function loadSvgBuffer(svgPath) {
    return fs.readFileSync(svgPath);
}

async function fitToHeight(buf, targetHeight) {
    return sharp(buf, { density: 300 })
        .trim()
        .resize({ height: targetHeight, fit: "inside", withoutEnlargement: false })
        .toBuffer({ resolveWithObject: true });
}

async function composeCanvas(layers, outPath, canvasW, canvasH) {
    await sharp({
        create: { width: canvasW, height: canvasH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
    })
        .composite(layers)
        .png()
        .toFile(outPath);
    console.log(`wrote ${outPath} (${canvasW}x${canvasH}, ${fs.statSync(outPath).size} bytes)`);
}

// Lay a horizontal row of {img, info} entries centered at (canvasCenterX, rowTopY).
// Each image is vertically centered against the row's max height.
function layoutRow(entries, gap, canvasCenterX, rowTopY) {
    const rowHeight = Math.max(...entries.map((e) => e.info.height));
    const rowWidth  = entries.reduce((sum, e) => sum + e.info.width, 0) + gap * (entries.length - 1);
    let cursor = canvasCenterX - Math.floor(rowWidth / 2);
    return entries.map((e) => {
        const placed = {
            input: e.data,
            left: cursor,
            top:  rowTopY + Math.floor((rowHeight - e.info.height) / 2),
        };
        cursor += e.info.width + gap;
        return placed;
    });
}

async function main() {
    fs.mkdirSync(OUT_DIR, { recursive: true });

    const tanuhRaw = loadSvgBuffer(path.join(SVG_DIR, "TANUH.svg"));
    const moeRaw   = loadSvgBuffer(path.join(SVG_DIR, "Ministry_of_Education_India.svg"));

    const tanuh = await fitToHeight(tanuhRaw, TANUH_H);
    const moe   = await fitToHeight(moeRaw,   MOE_H);

    console.log(`trimmed dims — tanuh: ${tanuh.info.width}x${tanuh.info.height}, ` +
                `moe: ${moe.info.width}x${moe.info.height}`);

    const rowY = Math.floor((CANVAS_H - TANUH_H) / 2);
    const layers = layoutRow([tanuh, moe], ROW_GAP, CANVAS_W / 2, rowY);

    await composeCanvas(layers, path.join(OUT_DIR, "logo.png"),        CANVAS_W, CANVAS_H);
    await composeCanvas(layers, path.join(OUT_DIR, "splash_logo.png"), CANVAS_W, CANVAS_H);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
