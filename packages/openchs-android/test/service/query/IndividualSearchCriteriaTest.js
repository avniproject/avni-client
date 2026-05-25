import {assert} from "chai";
import moment from "moment";
import IndividualSearchCriteria from "../../../src/service/query/IndividualSearchCriteria";

describe("IndividualSearchCriteriaTest", () => {
    describe("subject answer filters", () => {
        it("includes allowedSubjectUUIDs as an OR clause when set", () => {
            const criteria = IndividualSearchCriteria.empty();
            criteria.addAllowedSubjectUUIDsCriteria(["uuid-a", "uuid-b"]);

            const filter = criteria.getFilterCriteria();
            assert.include(filter, `uuid = "uuid-a"`);
            assert.include(filter, `uuid = "uuid-b"`);
            assert.include(filter, `uuid = "uuid-a" OR uuid = "uuid-b"`);
        });

        it("includes excludedSubjectUUIDs as an AND clause when set", () => {
            const criteria = IndividualSearchCriteria.empty();
            criteria.addExcludedSubjectUUIDsCriteria(["uuid-a", "uuid-b"]);

            const filter = criteria.getFilterCriteria();
            assert.include(filter, `uuid != "uuid-a"`);
            assert.include(filter, `uuid != "uuid-b"`);
            assert.include(filter, `uuid != "uuid-a" AND uuid != "uuid-b"`);
        });

        // allowed and excluded UUIDs are mutually exclusive by design — guarded
        // upstream in FormElementStatusBuilder.build() and the FormElementStatus
        // constructor — so we don't test a combined state here.

        it("omits allowed/excluded clauses when not set", () => {
            const criteria = IndividualSearchCriteria.empty();
            const filter = criteria.getFilterCriteria();
            assert.notInclude(filter, "uuid = ");
            assert.notInclude(filter, "uuid != ");
        });

        it("preserves excludedSubjectUUIDs across clone", () => {
            const criteria = IndividualSearchCriteria.empty();
            criteria.addExcludedSubjectUUIDsCriteria(["uuid-a"]);

            const cloned = criteria.clone();
            assert.deepEqual(cloned.excludedSubjectUUIDs, ["uuid-a"]);
            assert.include(cloned.getFilterCriteria(), `uuid != "uuid-a"`);
        });
    });

    describe("date of birth filter", () => {
        it("emits a day-range predicate bound to $1/$0 when DOB is set", () => {
            const criteria = IndividualSearchCriteria.empty();
            const dob = moment("1990-06-15").startOf('day').toDate();
            criteria.addDateOfBirthCriteria(dob);

            const filter = criteria.getFilterCriteria();
            // Inclusive lower bound on $1 (start-of-day), exclusive upper bound on $0 (start-of-next-day)
            assert.include(filter, "dateOfBirth >= $1");
            assert.include(filter, "dateOfBirth < $0");
        });

        it("binds $1 to start-of-day and $0 to start-of-next-day for the chosen DOB", () => {
            const criteria = IndividualSearchCriteria.empty();
            // Mid-day to verify normalisation to start-of-day
            const dob = moment("1990-06-15 14:30:00").toDate();
            criteria.addDateOfBirthCriteria(dob);

            const minBound = criteria.getMinDateOfBirth(); // $0 in IndividualService.search
            const maxBound = criteria.getMaxDateOfBirth(); // $1 in IndividualService.search

            assert.strictEqual(moment(maxBound).valueOf(), moment("1990-06-15").startOf('day').valueOf(),
                "getMaxDateOfBirth (bound to $1) should be start-of-day for the chosen DOB");
            assert.strictEqual(moment(minBound).valueOf(), moment("1990-06-16").startOf('day').valueOf(),
                "getMinDateOfBirth (bound to $0) should be start-of-next-day for the chosen DOB");
        });

        it("D3: when both DOB and age are set, DOB predicate is emitted and age window predicate is skipped", () => {
            const criteria = IndividualSearchCriteria.empty();
            criteria.addAgeCriteria("35");
            criteria.addDateOfBirthCriteria(moment("1990-06-15").startOf('day').toDate());

            const filter = criteria.getFilterCriteria();
            // DOB clause present
            assert.include(filter, "dateOfBirth >= $1 AND dateOfBirth < $0");
            // Age clause shape NOT present (it would be `dateOfBirth <= $0 AND dateOfBirth >= $1`)
            assert.notInclude(filter, "dateOfBirth <= $0");
        });

        it("falls back to age window predicate when DOB is not set", () => {
            const criteria = IndividualSearchCriteria.empty();
            criteria.addAgeCriteria("35");

            const filter = criteria.getFilterCriteria();
            assert.include(filter, "dateOfBirth <= $0 AND dateOfBirth >= $1");
            assert.notInclude(filter, "dateOfBirth < $0");
        });

        it("emits no DOB / age predicate when neither is set", () => {
            const criteria = IndividualSearchCriteria.empty();
            const filter = criteria.getFilterCriteria();
            assert.notInclude(filter, "dateOfBirth");
        });

        it("preserves dateOfBirth across clone", () => {
            const criteria = IndividualSearchCriteria.empty();
            const dob = moment("1990-06-15").startOf('day').toDate();
            criteria.addDateOfBirthCriteria(dob);

            const cloned = criteria.clone();
            assert.strictEqual(moment(cloned.dateOfBirth).valueOf(), moment(dob).valueOf());
            assert.include(cloned.getFilterCriteria(), "dateOfBirth >= $1 AND dateOfBirth < $0");
        });
    });
});
