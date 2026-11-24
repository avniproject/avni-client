import SqliteQueryBuilder from '../../src/repository/SqliteQueryBuilder';

function createMockDb(schemaName = 'TestSchema') {
    const mockProxy = {
        filtered: jest.fn().mockReturnThis(),
        sorted: jest.fn().mockReturnThis(),
        length: 0,
        0: undefined,
        [Symbol.iterator]: function* () {},
    };
    return {
        objects: jest.fn().mockReturnValue(mockProxy),
        isSqlite: true,
        _proxy: mockProxy,
    };
}

describe('SqliteQueryBuilder', () => {
    let db;
    let builder;

    beforeEach(() => {
        db = createMockDb();
        builder = new SqliteQueryBuilder(db, 'TestSchema');
    });

    describe('fluent chaining', () => {
        it('returns this from all builder methods', () => {
            expect(builder.eq('name', 'John')).toBe(builder);
            expect(builder.neq('voided', true)).toBe(builder);
            expect(builder.gt('age', 18)).toBe(builder);
            expect(builder.gte('age', 18)).toBe(builder);
            expect(builder.lt('age', 65)).toBe(builder);
            expect(builder.lte('age', 65)).toBe(builder);
            expect(builder.between('age', 18, 65)).toBe(builder);
            expect(builder.isNull('middleName')).toBe(builder);
            expect(builder.isNotNull('firstName')).toBe(builder);
            expect(builder.contains('name', 'jo')).toBe(builder);
            expect(builder.in('uuid', ['a', 'b'])).toBe(builder);
            expect(builder.nonVoided()).toBe(builder);
            expect(builder.sorted('name')).toBe(builder);
            expect(builder.distinct('name')).toBe(builder);
            expect(builder.sizeGt('enrolments', 0)).toBe(builder);
            expect(builder.sizeEq('encounters', 1)).toBe(builder);
            expect(builder.raw('name = $0', 'test')).toBe(builder);
        });
    });

    describe('eq', () => {
        it('applies parameterized filter via filtered()', () => {
            builder.eq('name', 'John').all();

            expect(db._proxy.filtered).toHaveBeenCalledWith('name = $0', 'John');
        });
    });

    describe('neq', () => {
        it('applies != filter', () => {
            builder.neq('voided', true).all();

            expect(db._proxy.filtered).toHaveBeenCalledWith('voided != $0', true);
        });
    });

    describe('contains', () => {
        it('applies CONTAINS filter', () => {
            builder.contains('name', 'jo').all();

            expect(db._proxy.filtered).toHaveBeenCalledWith('name CONTAINS $0', 'jo');
        });

        it('applies case-insensitive CONTAINS', () => {
            builder.contains('name', 'jo', {caseInsensitive: true}).all();

            expect(db._proxy.filtered).toHaveBeenCalledWith('name CONTAINS[c] $0', 'jo');
        });
    });

    describe('in', () => {
        it('applies IN filter with values', () => {
            builder.in('uuid', ['a', 'b', 'c']).all();

            expect(db._proxy.filtered).toHaveBeenCalledWith('uuid IN {"a","b","c"}');
        });

        it('applies impossible filter for empty values', () => {
            builder.in('uuid', []).all();

            expect(db._proxy.filtered).toHaveBeenCalledWith('uuid = "___never_match___"');
        });
    });

    describe('nonVoided', () => {
        it('applies voided = false filter', () => {
            builder.nonVoided().all();

            expect(db._proxy.filtered).toHaveBeenCalledWith('voided = false');
        });
    });

    describe('sorted', () => {
        it('applies sort to results proxy', () => {
            builder.sorted('name', true).all();

            expect(db._proxy.sorted).toHaveBeenCalledWith('name', true);
        });
    });

    describe('distinct', () => {
        it('applies TRUEPREDICATE DISTINCT filter', () => {
            builder.distinct('name').all();

            expect(db._proxy.filtered).toHaveBeenCalledWith('TRUEPREDICATE DISTINCT(name)');
        });
    });

    describe('between', () => {
        it('applies range filter', () => {
            builder.between('age', 18, 65).all();

            expect(db._proxy.filtered).toHaveBeenCalledWith('age >= $0 AND age <= $1', 18, 65);
        });
    });

    describe('multiple filters', () => {
        it('applies all filters in sequence', () => {
            builder.nonVoided().eq('name', 'John').sorted('name').all();

            expect(db._proxy.filtered).toHaveBeenCalledTimes(2);
            expect(db._proxy.filtered).toHaveBeenCalledWith('voided = false');
            expect(db._proxy.filtered).toHaveBeenCalledWith('name = $0', 'John');
            expect(db._proxy.sorted).toHaveBeenCalledWith('name', false);
        });
    });

    describe('or', () => {
        it('combines branches with OR', () => {
            builder.or(
                q => q.eq('name', 'John'),
                q => q.eq('name', 'Jane')
            ).all();

            expect(db._proxy.filtered).toHaveBeenCalledWith('( name = "John" OR name = "Jane" )');
        });
    });

    describe('raw', () => {
        it('applies raw filter string with params', () => {
            builder.raw('name BEGINSWITH $0', 'J').all();

            expect(db._proxy.filtered).toHaveBeenCalledWith('name BEGINSWITH $0', 'J');
        });

        it('applies raw literal filter', () => {
            builder.raw('voided = false').all();

            expect(db._proxy.filtered).toHaveBeenCalledWith('voided = false');
        });
    });

    describe('first', () => {
        it('returns first element', () => {
            const entity = {uuid: 'abc'};
            db._proxy.length = 1;
            db._proxy[0] = entity;

            expect(builder.first()).toBe(entity);
        });

        it('returns null when empty', () => {
            db._proxy.length = 0;

            expect(builder.first()).toBeNull();
        });
    });

    describe('count', () => {
        it('returns length of results', () => {
            db._proxy.length = 42;

            expect(builder.count()).toBe(42);
        });
    });

    describe('sizeGt and sizeEq', () => {
        it('adds JS fallback filters', () => {
            // These are routed to JsFallbackFilterEvaluator, not SQL
            expect(builder.sizeGt('enrolments', 0)._jsFallbackFilters).toHaveLength(1);
            expect(builder.sizeEq('encounters', 1)._jsFallbackFilters).toHaveLength(2);
        });
    });
});
