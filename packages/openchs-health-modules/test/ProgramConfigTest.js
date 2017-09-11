const expect = require('chai').expect;

describe('ProgramConfigTest', () => {
    it('wiring', () => {
        const imports = require('../health_modules/programConfig');
        expect(imports.config).is.not.undefined;
        expect(imports.observationRules).is.not.undefined;
    });

    it('no observation rules', () => {
        const imports = require('../health_modules/programConfig');
        expect(imports.observationRules("nonexistent").length).is.equal(0);
    });
});