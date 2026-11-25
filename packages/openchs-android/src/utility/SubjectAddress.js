import _ from "lodash";

// A subject received from another phone in a camp can point at a village this phone does not have.
export const hasAddress = (subject) => _.isFunction(_.get(subject, "fullAddress"))
    && _.isFunction(_.get(subject, "lowestAddressLevel.getLineage"))
    && !_.isNil(_.get(subject, "lowestAddressLevel.name"));

export const fullAddressOf = (subject, i18n) => hasAddress(subject) ? subject.fullAddress(i18n) : "";

export const subjectLabelWithAddress = (subject) => hasAddress(subject)
    ? `${subject.nameString} (${subject.lowestAddressLevel.translatedFieldValue})`
    : subject.nameString;

export const isSubjectWithoutAddressHere = (entityName, entity) => entityName === "Individual" && !_.get(entity, "lowestAddressLevel");
