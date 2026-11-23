import {assert} from "chai";
import {AddressLevel, Gender, Individual, SubjectType} from "openchs-models";
import {profileHeadingSuffix, programProfileHeadingText} from "../../../src/views/common/IndividualProfileHeading";

const i18n = {t: (key) => key};

const village = () => {
    const district = AddressLevel.create({uuid: "d", title: "Koraput", level: 2, typeString: "District"});
    const level = AddressLevel.create({uuid: "v", title: "Kotpad", level: 1, typeString: "Village"});
    level.locationMappings = [{parent: district, child: level}];
    return level;
};

const subject = ({isPerson, lowestAddressLevel}) => {
    const individual = Individual.createEmptyInstance();
    individual.firstName = "Foxtrot";
    individual.subjectType = SubjectType.create(isPerson ? "Person" : "House", false, false,
        isPerson ? SubjectType.types.Person : SubjectType.types.Household);
    individual.lowestAddressLevel = lowestAddressLevel;
    if (isPerson) {
        individual.gender = Gender.create("Female");
        individual.dateOfBirth = new Date(1990, 0, 1);
    }
    return individual;
};

// A patient shared through the camp hub can carry a village the hub phone does not have.
describe("IndividualProfileHeading", () => {
    it("draws the heading of a household whose village is not on this phone", () => {
        const household = subject({isPerson: false, lowestAddressLevel: null});
        assert.throws(() => household.fullAddress(i18n), /getLineage/);
        assert.equal(profileHeadingSuffix(household, i18n), "");
        assert.equal(programProfileHeadingText(household, i18n), "");
    });

    it("draws a person's gender and age with no trailing comma when the village is not on this phone", () => {
        const person = subject({isPerson: true, lowestAddressLevel: null});
        const suffix = profileHeadingSuffix(person, i18n);
        assert.match(suffix, /^Female, .+[^, ]$/);
        assert.match(programProfileHeadingText(person, i18n), /^Female, .+[^, ]$/);
    });

    it("keeps the village and the levels above it when they are on this phone", () => {
        const person = subject({isPerson: true, lowestAddressLevel: village()});
        assert.match(profileHeadingSuffix(person, i18n), /^Female, .+, Koraput, Kotpad$/);
        assert.match(programProfileHeadingText(person, i18n), /^Female, .+, Koraput, Kotpad$/);
        assert.equal(profileHeadingSuffix(subject({isPerson: false, lowestAddressLevel: village()}), i18n), "Koraput, Kotpad");
    });
});
