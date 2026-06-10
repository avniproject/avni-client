import RealmQueryBuilder from '../../src/repository/RealmQueryBuilder';

function createMockResults(data = []) {
    const results = [...data];
    results.filtered = jest.fn(function (...args) {
        return createMockResults(data);
    });
    results.sorted = jest.fn(function (field, desc) {
        return createMockResults(data);
    });
    return results;
}

describe('RealmQueryBuilder', () => {
    let mockResults;

    beforeEach(() => {
        mockResults = createMockResults([{uuid: '1', name: 'Test'}]);
    });

    describe('eq()', () => {
        it('applies equality filter with parameterized value', () => {
            new RealmQueryBuilder(mockResults).eq('uuid', 'abc').all();
            expect(mockResults.filtered).toHaveBeenCalledWith('uuid = $0', 'abc');
        });

        it('supports relationship traversal fields', () => {
            new RealmQueryBuilder(mockResults).eq('subjectType.uuid', 'st-1').all();
            expect(mockResults.filtered).toHaveBeenCalledWith('subjectType.uuid = $0', 'st-1');
        });
    });

    describe('neq()', () => {
        it('applies not-equal filter', () => {
            new RealmQueryBuilder(mockResults).neq('uuid', 'abc').all();
            expect(mockResults.filtered).toHaveBeenCalledWith('uuid != $0', 'abc');
        });
    });

    describe('comparison operators', () => {
        it('gt() applies greater-than filter', () => {
            new RealmQueryBuilder(mockResults).gt('level', 3).all();
            expect(mockResults.filtered).toHaveBeenCalledWith('level > $0', 3);
        });

        it('gte() applies greater-than-or-equal filter', () => {
            const date = new Date();
            new RealmQueryBuilder(mockResults).gte('encounterDateTime', date).all();
            expect(mockResults.filtered).toHaveBeenCalledWith('encounterDateTime >= $0', date);
        });

        it('lt() applies less-than filter', () => {
            new RealmQueryBuilder(mockResults).lt('level', 5).all();
            expect(mockResults.filtered).toHaveBeenCalledWith('level < $0', 5);
        });

        it('lte() applies less-than-or-equal filter', () => {
            const date = new Date();
            new RealmQueryBuilder(mockResults).lte('maxVisitDateTime', date).all();
            expect(mockResults.filtered).toHaveBeenCalledWith('maxVisitDateTime <= $0', date);
        });
    });

    describe('between()', () => {
        it('applies range filter with two params', () => {
            const from = new Date('2024-01-01');
            const to = new Date('2024-12-31');
            new RealmQueryBuilder(mockResults).between('encounterDateTime', from, to).all();
            expect(mockResults.filtered).toHaveBeenCalledWith(
                'encounterDateTime >= $0 AND encounterDateTime <= $1', from, to
            );
        });
    });

    describe('null checks', () => {
        it('isNull() applies null check', () => {
            new RealmQueryBuilder(mockResults).isNull('encounterDateTime').all();
            expect(mockResults.filtered).toHaveBeenCalledWith('encounterDateTime = null');
        });

        it('isNotNull() applies not-null check', () => {
            new RealmQueryBuilder(mockResults).isNotNull('heroImage').all();
            expect(mockResults.filtered).toHaveBeenCalledWith('heroImage <> null');
        });
    });

    describe('contains()', () => {
        it('applies case-sensitive contains by default', () => {
            new RealmQueryBuilder(mockResults).contains('name', 'test').all();
            expect(mockResults.filtered).toHaveBeenCalledWith('name CONTAINS $0', 'test');
        });

        it('applies case-insensitive contains with option', () => {
            new RealmQueryBuilder(mockResults).contains('name', 'test', {caseInsensitive: true}).all();
            expect(mockResults.filtered).toHaveBeenCalledWith('name CONTAINS[c] $0', 'test');
        });
    });

    describe('in()', () => {
        it('applies Realm IN filter', () => {
            new RealmQueryBuilder(mockResults).in('uuid', ['a', 'b', 'c']).all();
            expect(mockResults.filtered).toHaveBeenCalledWith(
                'uuid IN {"a","b","c"}'
            );
        });

        it('returns no matches for empty values', () => {
            new RealmQueryBuilder(mockResults).in('uuid', []).all();
            expect(mockResults.filtered).toHaveBeenCalledWith('uuid = "___never_match___"');
        });

        it('supports relationship paths in field', () => {
            new RealmQueryBuilder(mockResults).in('subjectType.uuid', ['st-1', 'st-2']).all();
            expect(mockResults.filtered).toHaveBeenCalledWith(
                'subjectType.uuid IN {"st-1","st-2"}'
            );
        });
    });

    describe('nonVoided()', () => {
        it('applies voided = false filter', () => {
            new RealmQueryBuilder(mockResults).nonVoided().all();
            expect(mockResults.filtered).toHaveBeenCalledWith('voided = false');
        });
    });

    describe('collection size checks', () => {
        it('sizeGt() applies @size > N', () => {
            new RealmQueryBuilder(mockResults).sizeGt('media', 0).all();
            expect(mockResults.filtered).toHaveBeenCalledWith('media.@size > 0');
        });

        it('sizeEq() applies @count == N', () => {
            new RealmQueryBuilder(mockResults).sizeEq('locationMappings', 0).all();
            expect(mockResults.filtered).toHaveBeenCalledWith('locationMappings.@count == 0');
        });
    });

    describe('distinct()', () => {
        it('applies TRUEPREDICATE DISTINCT', () => {
            new RealmQueryBuilder(mockResults).distinct('typeUuid').all();
            expect(mockResults.filtered).toHaveBeenCalledWith('TRUEPREDICATE DISTINCT(typeUuid)');
        });
    });

    describe('sorted()', () => {
        it('applies ascending sort by default', () => {
            const filteredResults = createMockResults([{uuid: '1'}]);
            mockResults.filtered.mockReturnValue(filteredResults);

            new RealmQueryBuilder(mockResults).nonVoided().sorted('name').all();
            expect(filteredResults.sorted).toHaveBeenCalledWith('name', false);
        });

        it('applies descending sort when specified', () => {
            const filteredResults = createMockResults([{uuid: '1'}]);
            mockResults.filtered.mockReturnValue(filteredResults);

            new RealmQueryBuilder(mockResults).nonVoided().sorted('enrolmentDateTime', true).all();
            expect(filteredResults.sorted).toHaveBeenCalledWith('enrolmentDateTime', true);
        });
    });

    describe('or()', () => {
        it('combines branches with OR', () => {
            new RealmQueryBuilder(mockResults).or(
                q => q.eq('encounterType.name', 'Visit'),
                q => q.eq('encounterType.uuid', 'et-1')
            ).all();
            expect(mockResults.filtered).toHaveBeenCalledWith(
                '( encounterType.name = "Visit" OR encounterType.uuid = "et-1" )'
            );
        });
    });

    describe('raw()', () => {
        it('applies literal filter string', () => {
            new RealmQueryBuilder(mockResults).raw('voided = null or voided = false').all();
            expect(mockResults.filtered).toHaveBeenCalledWith('voided = null or voided = false');
        });

        it('applies parameterized filter string', () => {
            new RealmQueryBuilder(mockResults).raw('uuid = $0', 'abc').all();
            expect(mockResults.filtered).toHaveBeenCalledWith('uuid = $0', 'abc');
        });
    });

    describe('chaining', () => {
        it('chains multiple filters as AND conditions', () => {
            // Each .filtered() call on Realm results is an implicit AND
            const step1 = createMockResults([{uuid: '1'}]);
            const step2 = createMockResults([{uuid: '1'}]);
            mockResults.filtered.mockReturnValue(step1);
            step1.filtered.mockReturnValue(step2);

            new RealmQueryBuilder(mockResults)
                .nonVoided()
                .eq('subjectType.uuid', 'st-1')
                .all();

            expect(mockResults.filtered).toHaveBeenCalledWith('voided = false');
            expect(step1.filtered).toHaveBeenCalledWith('subjectType.uuid = $0', 'st-1');
        });

        it('chains filter + distinct + sort', () => {
            const step1 = createMockResults([{uuid: '1'}]);
            const step2 = createMockResults([{uuid: '1'}]);
            mockResults.filtered.mockReturnValue(step1);
            step1.filtered.mockReturnValue(step2);

            new RealmQueryBuilder(mockResults)
                .nonVoided()
                .distinct('typeUuid')
                .sorted('level')
                .all();

            expect(mockResults.filtered).toHaveBeenCalledWith('voided = false');
            expect(step1.filtered).toHaveBeenCalledWith('TRUEPREDICATE DISTINCT(typeUuid)');
            expect(step2.sorted).toHaveBeenCalledWith('level', false);
        });
    });

    describe('terminal operations', () => {
        it('all() returns results with correct length and elements', () => {
            const data = [{uuid: '1'}, {uuid: '2'}];
            const results = createMockResults(data);
            const qb = new RealmQueryBuilder(results);
            const all = qb.all();
            expect(all.length).toBe(2);
            expect(all[0]).toEqual({uuid: '1'});
            expect(all[1]).toEqual({uuid: '2'});
        });

        it('first() returns first element', () => {
            const data = [{uuid: '1'}, {uuid: '2'}];
            const results = createMockResults(data);
            expect(new RealmQueryBuilder(results).first()).toEqual({uuid: '1'});
        });

        it('first() returns null for empty results', () => {
            const results = createMockResults([]);
            expect(new RealmQueryBuilder(results).first()).toBeNull();
        });

        it('count() returns result length', () => {
            const data = [{uuid: '1'}, {uuid: '2'}, {uuid: '3'}];
            const results = createMockResults(data);
            expect(new RealmQueryBuilder(results).count()).toBe(3);
        });
    });

    describe('real-world patterns from codebase', () => {
        it('IndividualRepository.searchByName pattern', () => {
            const step1 = createMockResults([]);
            mockResults.filtered.mockReturnValue(step1);

            new RealmQueryBuilder(mockResults)
                .contains('name', 'John', {caseInsensitive: true})
                .sorted('name')
                .all();

            expect(mockResults.filtered).toHaveBeenCalledWith('name CONTAINS[c] $0', 'John');
            expect(step1.sorted).toHaveBeenCalledWith('name', false);
        });

        it('ConceptRepository.getAllWithMedia pattern', () => {
            const step1 = createMockResults([]);
            mockResults.filtered.mockReturnValue(step1);

            new RealmQueryBuilder(mockResults)
                .nonVoided()
                .sizeGt('media', 0)
                .all();

            expect(mockResults.filtered).toHaveBeenCalledWith('voided = false');
            expect(step1.filtered).toHaveBeenCalledWith('media.@size > 0');
        });

        it('BaseAddressLevelService distinct typeUuid pattern', () => {
            const step1 = createMockResults([]);
            const step2 = createMockResults([]);
            mockResults.filtered.mockReturnValue(step1);
            step1.filtered.mockReturnValue(step2);

            new RealmQueryBuilder(mockResults)
                .nonVoided()
                .sizeEq('locationMappings', 0)
                .distinct('typeUuid')
                .all();

            expect(mockResults.filtered).toHaveBeenCalledWith('voided = false');
            expect(step1.filtered).toHaveBeenCalledWith('locationMappings.@count == 0');
            expect(step2.filtered).toHaveBeenCalledWith('TRUEPREDICATE DISTINCT(typeUuid)');
        });

        it('EncounterService OR type match pattern', () => {
            new RealmQueryBuilder(mockResults).or(
                q => q.eq('encounterType.name', 'Home Visit'),
                q => q.eq('encounterType.uuid', 'et-uuid-1')
            ).all();

            expect(mockResults.filtered).toHaveBeenCalledWith(
                '( encounterType.name = "Home Visit" OR encounterType.uuid = "et-uuid-1" )'
            );
        });

        it('IndividualService scheduled visits date range pattern', () => {
            const now = new Date();
            const step1 = createMockResults([]);
            const step2 = createMockResults([]);
            const step3 = createMockResults([]);
            mockResults.filtered.mockReturnValue(step1);
            step1.filtered.mockReturnValue(step2);
            step2.filtered.mockReturnValue(step3);

            new RealmQueryBuilder(mockResults)
                .nonVoided()
                .lte('earliestVisitDateTime', now)
                .gte('maxVisitDateTime', now)
                .isNull('encounterDateTime')
                .all();

            expect(mockResults.filtered).toHaveBeenCalledWith('voided = false');
            expect(step1.filtered).toHaveBeenCalledWith('earliestVisitDateTime <= $0', now);
            expect(step2.filtered).toHaveBeenCalledWith('maxVisitDateTime >= $0', now);
            expect(step3.filtered).toHaveBeenCalledWith('encounterDateTime = null');
        });

        it('PrivilegeService in-list pattern', () => {
            new RealmQueryBuilder(mockResults)
                .in('uuid', ['priv-1', 'priv-2', 'priv-3'])
                .all();

            expect(mockResults.filtered).toHaveBeenCalledWith(
                'uuid IN {"priv-1","priv-2","priv-3"}'
            );
        });

        it('TaskService date range + null check pattern', () => {
            const from = new Date('2024-01-01');
            const to = new Date('2024-01-31');
            const step1 = createMockResults([]);
            mockResults.filtered.mockReturnValue(step1);

            new RealmQueryBuilder(mockResults)
                .between('scheduledOn', from, to)
                .isNull('completedOn')
                .all();

            expect(mockResults.filtered).toHaveBeenCalledWith(
                'scheduledOn >= $0 AND scheduledOn <= $1', from, to
            );
            expect(step1.filtered).toHaveBeenCalledWith('completedOn = null');
        });

        it('ProgramEnrolmentService getAllEnrolments pattern', () => {
            const step1 = createMockResults([]);
            mockResults.filtered.mockReturnValue(step1);

            new RealmQueryBuilder(mockResults)
                .eq('program.uuid', 'prog-1')
                .sorted('enrolmentDateTime', true)
                .all();

            expect(mockResults.filtered).toHaveBeenCalledWith('program.uuid = $0', 'prog-1');
            expect(step1.sorted).toHaveBeenCalledWith('enrolmentDateTime', true);
        });

        it('EntityApprovalStatusService complex raw + SUBQUERY pattern', () => {
            // SUBQUERY patterns are too complex for the builder — use raw()
            const subqueryFilter = 'SUBQUERY(enrolments, $enrolment, $enrolment.voided = false).@count > 0';
            new RealmQueryBuilder(mockResults)
                .nonVoided()
                .raw(subqueryFilter)
                .all();

            expect(mockResults.filtered).toHaveBeenCalledWith('voided = false');
        });
    });
});
