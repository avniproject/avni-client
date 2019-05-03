import ChecklistItemDetail from "../src/ChecklistItemDetail";

describe("ChecklistItemTest", () => {
    const DEPENDENCY_UUID = "2a0956d1-1538-4459-90c4-becf75cdd27c";
    const DEPENDENT_UUID = "84812dd5-2a4a-4c0d-918d-995f720f15a0";
    let dependent, dependency, entityService;

    beforeEach(() => {
        dependent = {
            "uuid": DEPENDENT_UUID,
            "_links": {
                "leadDetailUUID": {
                    "href": DEPENDENCY_UUID
                }
            }
        };
        dependency = {
            "uuid": DEPENDENCY_UUID,
            "_links": {}
        };
        entityService = {
            findByKey: jest.fn().mockReturnValue(null)
        };
    });

    it("fromResource sets dependencies properly regardless of their order in a single page", () => {
        const resourcesInCurrentPage = [
            dependent,
            dependency
        ];
        const dependentItemDetail = ChecklistItemDetail.fromResource(dependent, entityService, resourcesInCurrentPage);
        expect(dependentItemDetail.dependentOn).toBeDefined();
        expect(dependentItemDetail.dependentOn).toBeInstanceOf(ChecklistItemDetail);
    });
});
