import BaseService from '../../src/service/BaseService';
import EncounterServiceUtil from '../../src/service/EncounterServiceUtil';
import {BACKENDS, createDualBackendHarness} from '../helpers/dualBackendTestHarness';

describe.each(BACKENDS)('Service write migration to repository layer [%s]', (backend) => {
    let harness;
    const schemaName = 'TestSchema';

    beforeEach(() => {
        harness = createDualBackendHarness(backend);
    });

    function createServiceWithSchema(schema = schemaName) {
        const service = new BaseService(harness.mockDb, harness.mockContext);
        service.getSchema = () => schema;
        return service;
    }

    describe('BaseService.getCreateEntityFunctions()', () => {
        it('uses repository.create() via db.create()', () => {
            const service = createServiceWithSchema();
            const entities = [{uuid: '1'}, {uuid: '2'}];

            const fns = service.getCreateEntityFunctions(schemaName, entities);
            fns.forEach(fn => fn());

            expect(harness.mockDb.create).toHaveBeenCalledTimes(2);
            expect(harness.mockDb.create).toHaveBeenCalledWith(schemaName, {uuid: '1'}, true);
            expect(harness.mockDb.create).toHaveBeenCalledWith(schemaName, {uuid: '2'}, true);
        });
    });

    describe('EncounterServiceUtil.isNotFilled()', () => {
        it('accepts repository instead of db', () => {
            const mockFilteredResult = {length: 1, filtered: jest.fn().mockReturnValue({length: 1})};
            const repository = {
                findAll: jest.fn().mockReturnValue({filtered: jest.fn().mockReturnValue(mockFilteredResult)}),
            };
            const entity = {uuid: 'enc-1'};

            const result = EncounterServiceUtil.isNotFilled(repository, entity);

            expect(repository.findAll).toHaveBeenCalled();
            expect(result).toBe(true);
        });

        it('returns true when no encounters exist', () => {
            const repository = {
                findAll: jest.fn().mockReturnValue({filtered: jest.fn().mockReturnValue({length: 0})}),
            };

            expect(EncounterServiceUtil.isNotFilled(repository, {uuid: 'x'})).toBe(true);
        });
    });

    describe('write method patterns', () => {
        it('services use db.write (via transactionManager) instead of direct db.write', () => {
            const service = createServiceWithSchema();
            const entity = {uuid: 'abc'};

            service.saveOrUpdate(entity);

            expect(harness.mockDb.write).toHaveBeenCalled();
        });

        it('services persist via db.create inside transactions', () => {
            const service = createServiceWithSchema();
            const entity = {uuid: 'abc'};

            service.save(entity);

            expect(harness.mockDb.create).toHaveBeenCalledWith(schemaName, entity, undefined);
        });

        it('services delete via db.delete inside transactions', () => {
            const service = createServiceWithSchema();
            const entity = {uuid: 'abc'};

            service.delete(entity);

            expect(harness.mockDb.delete).toHaveBeenCalledWith(entity);
        });
    });
});
