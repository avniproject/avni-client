const assert = require('chai').assert;

describe('IndividualRegistrationTest', () => {
    it('wiring', () => {
        const imports = require('../health_modules/individualRegistrationDecision');
        assert.isUndefined(imports.validate);
        assert.isUndefined(imports.numberOfFormElementGroups);
    });
});