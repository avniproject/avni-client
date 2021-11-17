import React from 'react';
import { FormElement } from "avni-models";
import AttendanceFormElement from "./AttendanceFormElement";
import MultiSelectSubjectFormElement from "./MultiSelectSubjectFormElement";

const MultiSelectSubjectLandingFormElement = (props) => {
    const isAttendance = props.element.recordValueByKey(FormElement.keys.isAttendance);
    return isAttendance ? <AttendanceFormElement {...props} /> : <MultiSelectSubjectFormElement {...props} />;

};

export default MultiSelectSubjectLandingFormElement;
