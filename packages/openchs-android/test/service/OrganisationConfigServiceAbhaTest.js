import OrganisationConfigService from "../../src/service/OrganisationConfigService";

const serviceWith = (settings) => {
    const service = new OrganisationConfigService(null, {getService: () => null});
    service.getSettings = () => settings;
    return service;
};

describe("OrganisationConfigService.isAbhaEnabled", () => {
    it("is on only when the organisation's enableAbha setting is true", () => {
        expect(serviceWith({enableAbha: true}).isAbhaEnabled()).toBe(true);
        expect(serviceWith({enableAbha: false}).isAbhaEnabled()).toBe(false);
        expect(serviceWith({}).isAbhaEnabled()).toBe(false);
    });

    it("ignores the spike's nested abha object, which the spec replaced", () => {
        expect(serviceWith({abha: {enabled: true}}).isAbhaEnabled()).toBe(false);
    });
});
