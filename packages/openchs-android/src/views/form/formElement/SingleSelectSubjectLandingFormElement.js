import React from 'react';
import { FormElement } from "avni-models";
import AttendanceFormElement from "./AttendanceFormElement";
import SingleSelectSubjectFormElement from "./SingleSelectSubjectFormElement";

const SingleSelectSubjectLandingFormElement = (props) => {
    const displayAllGroupMembers = props.element.recordValueByKey(FormElement.keys.displayAllGroupMembers);
    return displayAllGroupMembers ? <AttendanceFormElement {...props} /> : <SingleSelectSubjectFormElement {...props} />;
};

export default SingleSelectSubjectLandingFormElement;
