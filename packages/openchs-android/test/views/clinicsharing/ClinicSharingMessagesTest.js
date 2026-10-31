import {clinicSharingErrorText} from "../../../src/views/clinicsharing/ClinicSharingMessages";
import en from "../../../translations/en.json";

const I18n = {
    t: (key) => en.translations[key],
};

describe('Clinic sharing error messages', () => {
    it('returns the English message for hotspotFailed', () => {
        expect(clinicSharingErrorText(I18n, {code: 'hotspotFailed'}))
            .toBe("The hub's Wi-Fi could not start. Make sure Wi-Fi is turned on and this phone's personal hotspot is off, wait a few seconds, and tap Start hub again.");
    });

    it('returns the English message for hotspotNotAllowed', () => {
        expect(clinicSharingErrorText(I18n, {code: 'hotspotNotAllowed'}))
            .toBe(en.translations.clinicSharingError_hotspotNotAllowed);
    });

    it('returns the English message for locationOff', () => {
        expect(clinicSharingErrorText(I18n, {code: 'locationOff'}))
            .toBe(en.translations.clinicSharingError_locationOff);
    });
});
