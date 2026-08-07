import BaseIntegrationTest from "./BaseIntegrationTest";
import EdgeModelService from "../src/service/EdgeModelService";
import RNFS from "react-native-fs";

// Column contract consumed by verify/report.py.
const COLUMNS = ["model6", "model8", "model8-2"];
// TANUH's sheet names its folds model6/model8/model8-2; the provisioned DownloadableContent rows
// are named for the same folds (mvit2_fold1_6 etc.). Fold identity comes from the row NAME —
// EdgeModelService orders rows by sha256, which is arbitrary with respect to which fold is which,
// so attributing scores by position silently mislabels the columns.
const FOLD_MARKER_TO_COLUMN = {fold1_6: "model6", fold1_8: "model8", fold2_8: "model8-2"};
// Completion protocol with verify/run-parity.sh — keep both names in step with that script.
const COMPLETION_SENTINEL = "run-complete.json";
const FAILURE_SENTINEL = "run-failed.txt";
const sigmoid = (logit) => 1 / (1 + Math.exp(-logit));

// Module scope, not a method: the runner treats every prototype method as a test.
function resolveColumnBySha(edgeModelService) {
    const rows = edgeModelService.getAllNonVoided()
        .filter(row => row.category === "edgeModel" && row.sha256 && row.contentKey);
    const bySha = {};
    rows.forEach(row => {
        const marker = Object.keys(FOLD_MARKER_TO_COLUMN).find(m => (row.name || "").includes(m));
        if (marker) bySha[row.sha256] = FOLD_MARKER_TO_COLUMN[marker];
    });
    const resolved = Object.values(bySha);
    if (new Set(resolved).size !== COLUMNS.length) {
        throw new Error("EdgeModelParity: cannot map folds to TANUH columns by row name. Expected names "
            + `containing ${Object.keys(FOLD_MARKER_TO_COLUMN).join("/")}, got `
            + `[${rows.map(r => `${r.name}=${r.sha256}`).join(", ")}].`);
    }
    return bySha;
}

class EdgeModelParityIntegrationTest extends BaseIntegrationTest {
    // MUST override: the base setup calls realmDb.deleteAll(). On 17.x the folds resolve from synced
    // DownloadableContent rows in Realm, so a wipe destroys the device's synced state AND leaves the
    // sweep with no model ("no edgeModel content row is synced"). Harmless on newmodel, where models
    // came from APK assets. This test only reads image files and runs inference — nothing to set up.
    setup() {
        return this;
    }

    // The runner does not await this, so green means started, not finished — the sentinels do.
    async runParitySweep() {
        const base = `${RNFS.ExternalDirectoryPath}/parity`;
        const outDir = `${base}/out`;
        // Everything, setup included, inside the try: a throw out here would write no sentinel at all
        // and leave the collector waiting out its whole timeout on an error the device already knew.
        try {
            await RNFS.mkdir(outDir);
            await removeIfPresent(`${outDir}/${COMPLETION_SENTINEL}`);
            await removeIfPresent(`${outDir}/${FAILURE_SENTINEL}`);
            const rows = await sweepStagedImages(this.getService(EdgeModelService), base, outDir);
            // Written last, so its presence means both CSVs are complete on disk.
            await writeAtomic(`${outDir}/${COMPLETION_SENTINEL}`,
                JSON.stringify({rows: rows, finishedAt: new Date().toISOString()}));
            this.log(`EdgeModelParity: wrote ${rows} rows → ${outDir}/per_model_scores.csv`);
        } catch (error) {
            await writeFailureSentinel(outDir, error);
            throw error;
        }
    }
}

async function removeIfPresent(path) {
    try {
        if (await RNFS.exists(path))
            await RNFS.unlink(path);
    } catch (alreadyGone) {
        // exists/unlink is not atomic; losing the race is the outcome we wanted anyway.
    }
}

// A sentinel is polled by another process, so it must never be observable half-written. The bytes go
// to a temp name and RNFS.moveFile renames within the same dir — POSIX rename, so readers see the
// file absent or whole, never partial. Every reader gets this, not just the ones that guard for it.
async function writeAtomic(path, contents) {
    const temp = `${path}.tmp`;
    await RNFS.writeFile(temp, contents, "utf8");
    await RNFS.moveFile(temp, path);
}

// A failure to record the failure must not mask it.
async function writeFailureSentinel(outDir, error) {
    try {
        await writeAtomic(`${outDir}/${FAILURE_SENTINEL}`, `${(error && error.message) || error}\n`);
    } catch (ignored) {
        console.error("EdgeModelParity: could not write the failure sentinel", ignored);
    }
}

// Returns the data-row count read back off disk, not the image count — see the read-back below.
async function sweepStagedImages(edgeModelService, base, outDir) {
    const columnBySha = resolveColumnBySha(edgeModelService);

    const entries = await RNFS.readDir(`${base}/images`);
    const images = entries
        .filter(e => e.isFile() && /\.(jpe?g|png)$/i.test(e.name))
        .sort((a, b) => a.name.localeCompare(b.name));

    let csv = `image_id,${COLUMNS.join(",")}\n`;
    for (const img of images) {
        const id = img.name.replace(/\.[^.]+$/, "");   // <uuid>.jpg → <uuid> (matches xlsx Image ID)
        const {perModel} = await edgeModelService.runEnsembleInferenceOnImage(img.path);
        if (perModel.length !== COLUMNS.length) {
            throw new Error(`EdgeModelParity: expected ${COLUMNS.length} folds, got ${perModel.length} `
                + `[${perModel.map(m => m.sha256).join(",")}] — check provisioning before trusting a sweep.`);
        }
        // Distinct shas, not just the right count: a duplicated blob runs one model twice.
        const shas = perModel.map(m => m.sha256);
        if (new Set(shas).size !== shas.length) {
            throw new Error(`EdgeModelParity: duplicate fold sha256 [${shas.join(",")}] — `
                + `the ensemble is running the same model more than once. Fix provisioning before sweeping.`);
        }
        const byColumn = {};
        perModel.forEach(m => {
            const column = columnBySha[m.sha256];
            if (!column) {
                throw new Error(`EdgeModelParity: fold ${m.sha256} has no TANUH column mapping.`);
            }
            byColumn[column] = sigmoid(m.logit);
        });
        csv += `${id},${COLUMNS.map(c => byColumn[c]).join(",")}\n`;
    }
    const scoresPath = `${outDir}/per_model_scores.csv`;
    await RNFS.writeFile(scoresPath, csv, "utf8");

    // Count what landed rather than what we meant to write. A partial flush (device out of space)
    // otherwise reports the full image count and the truncated file is collected as complete.
    const written = countDataRows(await RNFS.readFile(scoresPath, "utf8"));
    if (written !== images.length) {
        throw new Error(`EdgeModelParity: wrote ${images.length} rows but ${scoresPath} holds ${written} `
            + `— the scores file is truncated, do not report on it.`);
    }

    const mapping = "column,sha256\n"
        + COLUMNS.map(c => `${c},${Object.keys(columnBySha).find(s => columnBySha[s] === c)}`).join("\n") + "\n";
    await RNFS.writeFile(`${outDir}/fold-mapping.csv`, mapping, "utf8");
    return written;
}

function countDataRows(csv) {
    return csv.split("\n").filter(line => line.trim().length > 0).length - 1;   // minus the header
}

export default EdgeModelParityIntegrationTest;
