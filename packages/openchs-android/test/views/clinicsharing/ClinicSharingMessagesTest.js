/**
 * #2233: the hub-start failures show a plain sentence, never "Something went wrong: ...generic".
 * Uses the real en.json so a dropped TRANSLATED_ERRORS entry or a missing key fails here.
 *
 * Run: npx jest test/views/clinicsharing/ClinicSharingMessagesTest.js --selectProjects unit
 */
jest.mock('../../../src/utility/General', () => ({__esModule: true, default: {logInfo: jest.fn(), logError: jest.fn()}}));

const en = require('../../../translations/en.json').translations;
const {clinicSharingErrorText} = require('../../../src/views/clinicsharing/ClinicSharingMessages');

const I18n = {t: (key, opts = {}) => (en[key] || key).replace(/{{(\w+)}}/g, (_, k) => opts[k])};

describe('clinicSharingErrorText for hub start failures', () => {
    it.each(['hotspotFailed', 'hotspotNotAllowed', 'locationOff'])('%s shows its own sentence, not the raw error', (code) => {
        const text = clinicSharingErrorText(I18n, {code, message: 'The hotspot could not start: generic'});
        expect(text).toBe(en[`clinicSharingError_${code}`]);
        expect(text).not.toMatch(/generic/);
    });

    it('hotspotFailed names Wi-Fi as a cause', () => {
        const text = clinicSharingErrorText(I18n, {code: 'hotspotFailed'});
        expect(text).toMatch(/Wi-Fi was just turned on/);
    });
});
