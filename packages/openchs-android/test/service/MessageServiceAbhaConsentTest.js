import MessageService from "../../src/service/MessageService";
import {PlatformTranslation} from "avni-models";

// NHA's M1 case CRT_ABHA_102: consent is asked before Eka's ABHA screens open. The app carries a default wording, so
// every organisation with ABHA on gets the step; an organisation's own wording, and then the platform's, win over it.
describe("The ABHA consent wording", () => {
    const serviceWith = (platform, organisation) => {
        const service = new MessageService({}, {});
        service.findAll = (name) => (name === PlatformTranslation.schema.name ? platform : organisation)
            .map(([language, text]) => ({language, getTranslations: () => ({abhaRegistrationConsent: text})}));
        service.findOnly = () => ({getSettings: () => ({languages: ["en"]})});
        service.getService = () => ({getUserSettings: () => ({locale: "en"})});
        service.getAll = () => [];
        service.init();
        return service.getI18n();
    };

    it("is the app's own default when neither the platform nor the organisation sets one", () => {
        const text = serviceWith([], []).t("abhaRegistrationConsent");
        expect(text).not.toBe("abhaRegistrationConsent");
        expect(text).toContain("ABHA");
    });

    it("is the organisation's own wording when it sets one, over the platform's and the app's", () => {
        expect(serviceWith([["en", "The platform's wording"]], [["en", "TANUH's wording"]]).t("abhaRegistrationConsent")).toBe("TANUH's wording");
    });
});
