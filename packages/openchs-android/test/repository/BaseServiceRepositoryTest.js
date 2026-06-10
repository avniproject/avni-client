import BaseService from '../../src/service/BaseService';
import {BACKENDS, createDualBackendHarness} from '../helpers/dualBackendTestHarness';

describe.each(BACKENDS)('BaseService repository delegation [%s]', (backend) => {
    let service;
    let harness;
    const schemaName = 'TestSchema';

    beforeEach(() => {
        harness = createDualBackendHarness(backend);
        service = new BaseService(harness.mockDb, harness.mockContext);
        service.getSchema = () => schemaName;
    });

    describe('read methods', () => {
        it('findAll() delegates through repository to db.objects()', () => {
            const result = service.findAll();

            expect(harness.mockDb.objects).toHaveBeenCalledWith(schemaName);
        });

        it('findAll(otherSchema) delegates to repository for that schema', () => {
            service.findAll('OtherSchema');

            expect(harness.mockDb.objects).toHaveBeenCalledWith('OtherSchema');
        });

        it('getAll() delegates through repository to db.objects()', () => {
            service.getAll();

            expect(harness.mockDb.objects).toHaveBeenCalledWith(schemaName);
        });

        it('getAllNonVoided() delegates through repository to db.objects() with filter', () => {
            service.getAllNonVoided();

            expect(harness.mockDb.objects).toHaveBeenCalledWith(schemaName);
        });

        it('findAllByCriteria() chains objects().filtered()', () => {
            service.findAllByCriteria('name = "Test"');

            expect(harness.mockDb.objects).toHaveBeenCalledWith(schemaName);
            expect(harness.mockDb._resultProxy.filtered).toHaveBeenCalledWith('name = "Test"');
        });
    });

    describe('write methods', () => {
        it('saveOrUpdate() uses db.write and db.create with update mode', () => {
            const entity = {uuid: 'abc', name: 'Test'};

            service.saveOrUpdate(entity);

            expect(harness.mockDb.write).toHaveBeenCalled();
            expect(harness.mockDb.create).toHaveBeenCalledWith(schemaName, entity, true);
        });

        it('save() uses db.write and db.create without update mode', () => {
            const entity = {uuid: 'abc', name: 'Test'};

            service.save(entity);

            expect(harness.mockDb.write).toHaveBeenCalled();
            expect(harness.mockDb.create).toHaveBeenCalledWith(schemaName, entity, undefined);
        });

        it('delete() uses db.write and db.delete', () => {
            const entity = {uuid: 'abc'};

            service.delete(entity);

            expect(harness.mockDb.write).toHaveBeenCalled();
            expect(harness.mockDb.delete).toHaveBeenCalledWith(entity);
        });

        it('deleteAll() uses db.write and db.delete on all objects', () => {
            service.deleteAll();

            expect(harness.mockDb.write).toHaveBeenCalled();
            expect(harness.mockDb.delete).toHaveBeenCalled();
        });

        it('bulkSaveOrUpdate() uses db.write', () => {
            const fn1 = jest.fn();
            const fn2 = jest.fn();

            service.bulkSaveOrUpdate([fn1, fn2]);

            expect(harness.mockDb.write).toHaveBeenCalled();
            expect(fn1).toHaveBeenCalled();
            expect(fn2).toHaveBeenCalled();
        });

        it('clearDataIn() uses db.write per entity type', () => {
            const entityTypes = [
                {schema: {name: 'TypeA'}},
                {schema: {name: 'TypeB'}},
            ];

            service.clearDataIn(entityTypes);

            expect(harness.mockDb.write).toHaveBeenCalledTimes(2);
            expect(harness.mockDb.objects).toHaveBeenCalledWith('TypeA');
            expect(harness.mockDb.objects).toHaveBeenCalledWith('TypeB');
        });
    });
});
