import BaseIntegrationTest from "./BaseIntegrationTest";
import EdgeModelService from "../src/service/EdgeModelService";
import RNFS from "react-native-fs";

// Column contract consumed by verify/report.py.
const COLUMNS = ["model6", "model8", "model8-2"];
const sigmoid = (logit) => 1 / (1 + Math.exp(-logit));

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

        const entries = await RNFS.readDir(`${base}/images`);
        const images = entries
            .filter(e => e.isFile() && /\.(jpe?g|png)$/i.test(e.name))
            .sort((a, b) => a.name.localeCompare(b.name));

        let csv = `image_id,${COLUMNS.join(",")}\n`;
        let foldOrder = null;
        for (const img of images) {
            const id = img.name.replace(/\.[^.]+$/, "");   // <uuid>.jpg → <uuid> (matches xlsx Image ID)
            const {perModel} = await edgeModelService.runEnsembleInferenceOnImage(img.path);
            // Folds are sha256-addressed rows, so a provisioning gap shows up as a count mismatch
            // rather than a silently shifted column. Refuse to attribute scores in that case.
            if (perModel.length !== COLUMNS.length) {
                throw new Error(`EdgeModelParity: expected ${COLUMNS.length} folds, got ${perModel.length} `
                    + `[${perModel.map(m => m.sha256).join(",")}] — check provisioning before trusting a sweep.`);
            }
            const shas = perModel.map(m => m.sha256);
            // The #1985 incident was a duplicated blob in the org's DownloadableContent: three rows,
            // two sharing a sha, so unanimous-AND ran over 2 distinct models while looking like 3.
            // Row count alone doesn't catch that — the shas must be distinct.
            if (new Set(shas).size !== shas.length) {
                throw new Error(`EdgeModelParity: duplicate fold sha256 [${shas.join(",")}] — `
                    + `the ensemble is running the same model more than once. Fix provisioning before sweeping.`);
            }
            if (foldOrder === null) {
                foldOrder = shas;
            } else if (shas.join(",") !== foldOrder.join(",")) {
                throw new Error(`EdgeModelParity: fold order changed mid-sweep (${foldOrder.join(",")} → ${shas.join(",")}).`);
            }
            csv += `${id},${perModel.map(m => sigmoid(m.logit)).join(",")}\n`;
        }
        await RNFS.writeFile(`${outDir}/per_model_scores.csv`, csv, "utf8");

        // Column position comes from EdgeModelService's sha256 sort, which carries no fold identity.
        // Record the mapping so a wrong-fold-to-column attribution is auditable after the fact.
        if (foldOrder) {
            const mapping = "column,sha256\n"
                + COLUMNS.map((c, i) => `${c},${foldOrder[i]}`).join("\n") + "\n";
            await RNFS.writeFile(`${outDir}/fold-mapping.csv`, mapping, "utf8");
        }
        this.log(`EdgeModelParity: wrote ${images.length} rows → ${outDir}/per_model_scores.csv`);
    }
}

export default EdgeModelParityIntegrationTest;
