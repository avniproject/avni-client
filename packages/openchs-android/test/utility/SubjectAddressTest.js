import {assert} from "chai";
import {AddressLevel, Individual, SubjectType} from "openchs-models";
import {fullAddressOf, subjectLabelWithAddress} from "../../src/utility/SubjectAddress";

const i18n = {t: (key) => key};

const addressLevel = (name, parent) => {
    const level = AddressLevel.create({uuid: `${name}-uuid`, title: name, level: parent ? 1 : 2, typeString: parent ? "Village" : "District"});
    if (parent) level.locationMappings = [{parent, child: level}];
    return level;
};

const subject = (lowestAddressLevel, type = SubjectType.types.Person) => {
    const individual = Individual.createEmptyInstance();
    individual.firstName = "Foxtrot";
    individual.name = "Foxtrot";
    individual.subjectType = SubjectType.create("House", false, false, type);
    individual.lowestAddressLevel = lowestAddressLevel;
    return individual;
};

// A patient shared through the camp hub can carry a village the hub phone does not have.
describe("SubjectAddress", () => {
    it("gives an empty address when the village is not on this phone", () => {
        assert.equal(fullAddressOf(subject(null), i18n), "");
        assert.equal(fullAddressOf(subject(undefined), i18n), "");
    });

    it("gives an empty address when the village is only a reference with nothing behind it", () => {
        const individual = subject(null);
        individual.that.lowestAddressLevel = {uuid: "not-on-this-phone"};
        assert.equal(fullAddressOf(individual, i18n), "");
    });

    it("gives the village and the levels above it when the village is on this phone", () => {
        const district = addressLevel("Koraput");
        const village = addressLevel("Kotpad", district);
        assert.equal(fullAddressOf(subject(village), i18n), subject(village).fullAddress(i18n));
        assert.include(fullAddressOf(subject(village), i18n), "Kotpad");
    });

    it("gives an empty address when the model holds false for a village it could not find", () => {
        const individual = Individual.newInstance("u", "Foxtrot", "", new Date(), false, null, null,
            SubjectType.create("House", false, false, SubjectType.types.Household));
        assert.isFalse(individual.that.lowestAddressLevel);
        assert.equal(fullAddressOf(individual, i18n), "");
        assert.equal(subjectLabelWithAddress(individual), individual.nameString);
    });

    it("gives an empty address for no subject, or for a plain object with no address method", () => {
        assert.equal(fullAddressOf(null, i18n), "");
        assert.equal(fullAddressOf({nameString: "Foxtrot", lowestAddressLevel: {getLineage: () => [], name: "Kotpad"}}, i18n), "");
    });

    it("labels a subject with its village, or with its name alone when the village is missing", () => {
        const village = addressLevel("Kotpad", addressLevel("Koraput"));
        assert.equal(subjectLabelWithAddress(subject(village)), `Foxtrot (${subject(village).lowestAddressLevel.translatedFieldValue})`);
        assert.equal(subjectLabelWithAddress(subject(null)), "Foxtrot");
    });
});
