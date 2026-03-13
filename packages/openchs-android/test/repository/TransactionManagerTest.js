import TransactionManager from '../../src/repository/TransactionManager';

describe('TransactionManager', () => {
    let mockDb;
    let tm;

    beforeEach(() => {
        mockDb = {
            write: jest.fn((fn) => fn()),
            isInTransaction: false,
        };
        tm = new TransactionManager(mockDb);
    });

    describe('write', () => {
        it('should delegate to db.write', () => {
            const fn = jest.fn();
            tm.write(fn);
            expect(mockDb.write).toHaveBeenCalledWith(fn);
        });

        it('should return the result of db.write', () => {
            mockDb.write.mockReturnValue('result');
            expect(tm.write(() => {})).toBe('result');
        });
    });

    describe('runInTransaction', () => {
        it('should call db.write when not in transaction', () => {
            mockDb.isInTransaction = false;
            const fn = jest.fn().mockReturnValue('value');

            tm.runInTransaction(fn);

            expect(mockDb.write).toHaveBeenCalledWith(fn);
        });

        it('should call fn directly when already in transaction', () => {
            mockDb.isInTransaction = true;
            const fn = jest.fn().mockReturnValue('value');

            const result = tm.runInTransaction(fn);

            expect(mockDb.write).not.toHaveBeenCalled();
            expect(fn).toHaveBeenCalled();
            expect(result).toBe('value');
        });
    });

    describe('isInTransaction', () => {
        it('should return db.isInTransaction', () => {
            mockDb.isInTransaction = false;
            expect(tm.isInTransaction).toBe(false);

            mockDb.isInTransaction = true;
            expect(tm.isInTransaction).toBe(true);
        });
    });

    describe('updateDatabase', () => {
        it('should update the db reference', () => {
            const newDb = {
                write: jest.fn((fn) => fn()),
                isInTransaction: false,
            };

            tm.updateDatabase(newDb);
            tm.write(() => {});

            expect(newDb.write).toHaveBeenCalled();
            expect(mockDb.write).not.toHaveBeenCalled();
        });
    });
});
