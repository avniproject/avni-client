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
const sigmoid = (logit) => 1 / (1 + Math.exp(-logit));

// sha256 -> TANUH column, resolved from the synced row names. Throws rather than guess: a wrong
// attribution produces a plausible-looking per-model table that is silently wrong.
// Module scope, not a method: IntegrationTestRunner treats every prototype method except
// constructor/setup/teardown as a test, so a helper on the class is run by the class-level Run
// button with no argument and reports a failure that isn't real. It never used `this`.
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

    // Auto-discovered test method (IntegrationTestRunner runs every method except constructor/setup/teardown).
    // Bulk-runs every staged image through the real EdgeModelService and writes one file per run.
    async runParitySweep() {
        const base = `${RNFS.ExternalDirectoryPath}/parity`;
        const outDir = `${base}/out`;
        await RNFS.mkdir(outDir);
        const edgeModelService = this.getService(EdgeModelService);
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
            // The #1985 incident was a duplicated blob in the org's DownloadableContent: three rows,
            // two sharing a sha, so unanimous-AND ran over 2 distinct models while looking like 3.
            // Row count alone doesn't catch that — the shas must be distinct.
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
        await RNFS.writeFile(`${outDir}/per_model_scores.csv`, csv, "utf8");

        const mapping = "column,sha256\n"
            + COLUMNS.map(c => `${c},${Object.keys(columnBySha).find(s => columnBySha[s] === c)}`).join("\n") + "\n";
        await RNFS.writeFile(`${outDir}/fold-mapping.csv`, mapping, "utf8");
        this.log(`EdgeModelParity: wrote ${images.length} rows → ${outDir}/per_model_scores.csv`);
    }
}

export default EdgeModelParityIntegrationTest;
