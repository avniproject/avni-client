const expect = require('chai').expect;

describe('ProgramConfigTest', () => {
    it('wiring', () => {
        const imports = require('../health_modules/programConfig');
        expect(imports.config).is.not.undefined;
    });
});