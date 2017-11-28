import {assert} from 'chai';
import Program from "../src/Program";

describe('ReferenceEntityTest', () => {
    it('clone', () => {
        const program = new Program();
        program.uuid = 'cd3d221d-bd7e-4837-8208-bd84691b929a';
        assert.equal(program.uuid, (program.clone().uuid));
    });
});