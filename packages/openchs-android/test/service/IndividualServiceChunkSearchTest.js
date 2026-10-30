jest.mock("../../src/framework/bean/Service", () => () => (target) => target);

import IndividualService from "../../src/service/IndividualService";
import IndividualSearchCriteria from "../../src/service/query/IndividualSearchCriteria";

describe("IndividualService chunked search (#2110)", () => {
    const runSearch = (inputUUIDs) => {
        const individuals = Array.from(
            new Set(inputUUIDs),
            uuid => ({uuid, name: `Subject ${uuid}`})
        );

        const filterCalls = [];

        const makeResults = (items) => ({
            filtered: jest.fn((query, ...args) => {
                filterCalls.push({query, args});

                if (!query.includes("uuid =")) {
                    return makeResults(items);
                }

                return makeResults(
                    items.filter(individual => args.includes(individual.uuid))
                );
            }),
            sorted: jest.fn(() => makeResults(items)),
            asArray: jest.fn(() => items),
            withHydration: jest.fn(() => makeResults(items))
        });

        const repository = {
            findAll: jest.fn(() => makeResults(individuals))
        };

        const context = {
            getRepositoryFactory: () => ({
                getRepository: () => repository
            })
        };

        const service = new IndividualService(null, context);
        const criteria = IndividualSearchCriteria.empty();
        criteria.addNameCriteria("Subject");

        const result = service.search(criteria, inputUUIDs);

        return {result, filterCalls};
    };

    it.each([500, 501, 1000, 1001])(
        "returns all %i matching subjects",
        (count) => {
            const uuids = Array.from(
                {length: count},
                (_, i) => `subject-${i}`
            );

            const {result, filterCalls} = runSearch(uuids);
            const uuidChunkCalls = filterCalls.filter(
                ({query}) => query.includes("uuid =")
            );

            expect(result).toHaveLength(count);
            expect(new Set(result.map(individual => individual.uuid)).size)
                .toBe(count);
            expect(uuidChunkCalls).toHaveLength(Math.ceil(count / 500));

            uuidChunkCalls.forEach((call, index) => {
                const expectedSize = Math.min(500, count - index * 500);
                expect(call.args).toHaveLength(expectedSize);
            });
        }
    );

    it("removes duplicate UUIDs before searching", () => {
        const uuids = [
            "subject-1",
            "subject-2",
            "subject-1",
            "subject-3",
            "subject-2"
        ];

        const {result, filterCalls} = runSearch(uuids);
        const uuidChunkCalls = filterCalls.filter(
            ({query}) => query.includes("uuid =")
        );

        expect(result.map(individual => individual.uuid).sort()).toEqual([
            "subject-1",
            "subject-2",
            "subject-3"
        ]);
        expect(uuidChunkCalls).toHaveLength(1);
        expect(uuidChunkCalls[0].args).toHaveLength(3);
    });
});
