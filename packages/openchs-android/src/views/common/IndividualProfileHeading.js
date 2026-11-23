import _ from "lodash";
import {fullAddressOf} from "../../utility/SubjectAddress";

const joinNonEmpty = (parts) => _.join(_.reject(parts, _.isEmpty), ", ");

export const profileHeadingSuffix = (individual, i18n) => {
    const parts = individual.subjectType.isPerson()
        ? [individual.userProfileSubtext1(i18n), individual.userProfileSubtext2(i18n)]
        : [];
    return joinNonEmpty([...parts, fullAddressOf(individual, i18n)]);
};

export const programProfileHeadingText = (individual, i18n) => {
    const parts = individual.subjectType.isPerson()
        ? [i18n.t(individual.gender.name), individual.getAgeAndDateOfBirthDisplay(i18n)]
        : [];
    return joinNonEmpty([...parts, fullAddressOf(individual, i18n)]);
};
