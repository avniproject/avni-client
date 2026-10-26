jest.mock("../../src/framework/bean/Service", () => () => (target) => target);

import IndividualService from "../../src/service/IndividualService";
import IndividualSearchCriteria from "../../src/service/query/IndividualSearchCriteria";

describe("IndividualService chunked search (#2110)", () => {
    it("checks UUIDs passed to chunked search", () => {
        const individuals = Array.from({length: 1001}, (_, i) => ({
            uuid: `subject-${i}`,
            name: `Subject ${String(i).padStart(4, "0")}`
        }));

        const filterCalls = [];

        const makeResults = (items) => ({
            filtered: jest.fn((query, ...args) => {
                filterCalls.push({query, args});
                // The first filtered() call applies the general criteria.
                if (query.includes("voided=false")) {
                    return makeResults(items);
                }
                // Later calls apply the UUID chunks.
                return makeResults(items.filter(individual => args.includes(individual.uuid)));
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

        const result = service.search(criteria, individuals.map(individual => individual.uuid));

        expect(result).toHaveLength(1001);
        expect(new Set(result.map(individual => individual.uuid)).size).toBe(1001);
        const uuidChunkCalls = filterCalls.filter(({query}) => query.includes('uuid ='));
        expect(uuidChunkCalls).toHaveLength(3);
        expect(uuidChunkCalls[0].args).toHaveLength(500);
        expect(uuidChunkCalls[1].args).toHaveLength(500);
        expect(uuidChunkCalls[2].args).toHaveLength(1); 
    });

});
