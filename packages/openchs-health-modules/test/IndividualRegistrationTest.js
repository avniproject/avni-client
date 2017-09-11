const expect = require('chai').expect;

describe('IndividualRegistrationTest', () => {
    it('wiring', () => {
        const imports = require('../health_modules/individualRegistrationDecision');
        expect(imports.validate).is.not.undefined;
        expect(imports.numberOfFormElementGroups).is.not.undefined;
    });
});