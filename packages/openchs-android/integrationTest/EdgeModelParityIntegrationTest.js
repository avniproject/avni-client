import BaseIntegrationTest from "./BaseIntegrationTest";
import EdgeModelService from "../src/service/EdgeModelService";
import RNFS from "react-native-fs";

// Registry fold key → the xlsx column name TANUH uses.
const FOLDS = [
    {key: "mvit2_fold1_6", col: "model6"},
    {key: "mvit2_fold1_8", col: "model8"},
    {key: "mvit2_fold2_8", col: "model8-2"},
];
const sigmoid = (logit) => 1 / (1 + Math.exp(-logit));

class EdgeModelParityIntegrationTest extends BaseIntegrationTest {
    // Auto-discovered test method (IntegrationTestRunner runs every method except constructor/setup/teardown).
    // Bulk-runs every staged image through the real EdgeModelService for all 3 folds and writes one file.
    async runParitySweep() {
        const base = `${RNFS.ExternalDirectoryPath}/parity`;
        const outDir = `${base}/out`;
        await RNFS.mkdir(outDir);
        const edgeModelService = this.getService(EdgeModelService);

        const entries = await RNFS.readDir(`${base}/images`);
        const images = entries
            .filter(e => e.isFile() && /\.(jpe?g|png)$/i.test(e.name))
            .sort((a, b) => a.name.localeCompare(b.name));

        let csv = "image_id,model6,model8,model8-2\n";
        for (const img of images) {
            const id = img.name.replace(/\.[^.]+$/, "");   // <uuid>.jpg → <uuid> (matches xlsx Image ID)
            const s = {};
            for (const f of FOLDS) {
                const res = await edgeModelService.runInferenceOnImage(f.key, img.path);
                s[f.col] = sigmoid(res.logit);             // per-model P(suspicious) — unambiguous from the raw logit
            }
            csv += `${id},${s.model6},${s.model8},${s["model8-2"]}\n`;
        }
        await RNFS.writeFile(`${outDir}/per_model_scores.csv`, csv, "utf8");
        this.log(`EdgeModelParity: wrote ${images.length} rows → ${outDir}/per_model_scores.csv`);
    }
}

export default EdgeModelParityIntegrationTest;
