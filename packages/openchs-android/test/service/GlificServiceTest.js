/**
 * #2196 — GlificService.init() runs at launch on Realm, and again wherever the runtime moves,
 * so it must not throw on a database with no Settings row, and must call the server the
 * settings name when the call is made.
 *
 * Run: npx jest test/service/GlificServiceTest.js --selectProjects unit
 */
jest.mock('../../src/framework/http/requests', () => ({getJSON: jest.fn(async () => [])}));
const {getJSON} = require('../../src/framework/http/requests');
const GlificService = require('../../src/service/GlificService').default;

describe('GlificService server URL (#2196)', () => {
    it('starts with no Settings row, and calls the server URL saved after init', async () => {
        let settings;
        const settingsService = {getSettings: () => settings};
        const service = new GlificService({}, {getService: () => settingsService});

        expect(() => service.init()).not.toThrow();

        settings = {serverURL: 'https://staging.avniproject.org'};
        await service.getAllMessagesForSubject('subject-uuid');

        expect(getJSON).toHaveBeenCalledWith('https://staging.avniproject.org/web/contact/subject/subject-uuid/msgs');
    });
});
