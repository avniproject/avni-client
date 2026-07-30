// Shared PDFs used to be named form-and-date only, so every slip shared on one day
// collided and the receiving app disambiguated them as "(1)", "(2)". The subject name
// now leads. Native modules are mocked so the module loads without a TurboModule registry.

import {assert} from "chai";
import moment from "moment";

jest.mock("../../src/framework/bean/Service", () => () => (target) => target);
jest.mock("react-native-share", () => ({open: jest.fn(() => Promise.resolve())}));
jest.mock("react-native-html-to-pdf", () => ({convert: jest.fn(() => Promise.resolve({filePath: "/tmp/x.pdf"}))}));
jest.mock("react-native-fs", () => ({CachesDirectoryPath: "/tmp", exists: jest.fn(), unlink: jest.fn(), moveFile: jest.fn()}));

import {buildPdfFileName} from "../../src/service/PDFGenerationService";

describe("buildPdfFileName", () => {
    const today = moment().format("DD_MM_YYYY");

    it("leads with the subject name, then the form title and the date", () => {
        assert.equal(buildPdfFileName("Ramesh Kumar", "Referral Slip"), `ramesh_kumar_referral_slip_${today}`);
    });

    it("gives two patients distinct names for the same form on the same day", () => {
        assert.notEqual(
            buildPdfFileName("Ramesh Kumar", "Referral Slip"),
            buildPdfFileName("Sunita Devi", "Referral Slip")
        );
    });

    it("falls back to the form title alone when the subject has no name", () => {
        assert.equal(buildPdfFileName(null, "Referral Slip"), `referral_slip_${today}`);
        assert.equal(buildPdfFileName("", "Referral Slip"), `referral_slip_${today}`);
    });

    it("falls back to 'form' when neither name is usable", () => {
        assert.equal(buildPdfFileName(null, null), `form_${today}`);
    });

    it("strips accents and punctuation so the result is a usable file name", () => {
        assert.equal(buildPdfFileName("José D'Souza", "Referral Slip"), `jose_d_souza_referral_slip_${today}`);
    });

    it("keeps non-Latin names intact rather than dropping them", () => {
        assert.equal(buildPdfFileName("रमेश कुमार", "Referral Slip"), `रमेश_कुमार_referral_slip_${today}`);
    });
});
