import {assert} from "chai";

jest.mock("../../src/framework/bean/Service", () => () => (target) => target);

import {Concept, CustomFilter} from "openchs-models";
import CustomFilterService from "../../src/service/CustomFilterService";

const PERSON = "st-person";
const conceptFilter = (titleKey, conceptUUID) => ({type: CustomFilter.type.Concept, titleKey, conceptUUID, subjectTypeUUID: PERSON, widget: "Default"});
const SEARCH_FILTERS = [
    conceptFilter("Education", "c-coded"),
    conceptFilter("Notes", "c-text"),
    conceptFilter("Removed question", "c-missing"),
    {type: CustomFilter.type.RegistrationDate, titleKey: "Registration date", subjectTypeUUID: PERSON, widget: "Range"},
];
const concept = (datatype) => Object.assign(new Concept(), {datatype});

// A missing uuid comes back as null on SQLite and as an empty Concept on Realm.
const serviceWhereMissingConceptIs = (missing) => {
    const concepts = {"c-coded": concept(Concept.dataType.Coded), "c-text": concept(Concept.dataType.Text)};
    const conceptService = {getConceptByUUID: uuid => uuid in concepts ? concepts[uuid] : missing};
    const service = new CustomFilterService({}, {getService: () => conceptService});
    service.getSettings = () => ({searchFilters: SEARCH_FILTERS});
    return service;
};

describe("search filters whose question is not on the device", () => {
    [["SQLite", null], ["Realm", new Concept()]].forEach(([db, missing]) => {
        it(`are left out of the filter lists on ${db}`, () => {
            const service = serviceWhereMissingConceptIs(missing);

            assert.sameMembers(service.getTopLevelFilters("searchFilters", PERSON).map(f => f.titleKey), ["Notes", "Registration date"]);
            assert.sameMembers(service.getBottomLevelFilters("searchFilters", PERSON).map(f => f.titleKey), ["Education"]);
        });
    });
});
