import React from 'react';
import { FormElement } from "avni-models";
import AttendanceFormElement from "./AttendanceFormElement";
import MultiSelectSubjectFormElement from "./MultiSelectSubjectFormElement";

const MultiSelectSubjectLandingFormElement = (props) => {
    const displayAllGroupMembers = props.element.recordValueByKey(FormElement.keys.displayAllGroupMembers);
    return displayAllGroupMembers ? <AttendanceFormElement {...props} /> : <MultiSelectSubjectFormElement {...props} />;

};

export default MultiSelectSubjectLandingFormElement;
