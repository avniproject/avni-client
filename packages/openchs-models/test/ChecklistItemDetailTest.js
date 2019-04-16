import ChecklistItemDetail from "../src/ChecklistItemDetail";

describe("ChecklistItemTest", () => {

    it("fromResource sets depedencies properly regardless of their order in a single page", () => {
        const entityService = {
            findByKey: jest.fn().mockReturnValue(null)
        };
        const DEPENDENCY_UUID = "2a0956d1-1538-4459-90c4-becf75cdd27c";
        const DEPENDENT_UUID = "84812dd5-2a4a-4c0d-918d-995f720f15a0";
        const dependentResource = {
            "uuid": DEPENDENT_UUID,
            "_links": {
                "leadDetailUUID": {
                    "href": DEPENDENCY_UUID
                }
            }
        };

        const resources = [
            dependentResource,
            {
                "uuid": DEPENDENCY_UUID,
                "_links": {}
            }
        ];


        const dependentItemDetail = ChecklistItemDetail.fromResource(dependentResource, entityService, resources);
        expect(dependentItemDetail.dependentOn).toBeDefined();
        expect(dependentItemDetail.dependentOn).toBeInstanceOf(ChecklistItemDetail);
    });
});
