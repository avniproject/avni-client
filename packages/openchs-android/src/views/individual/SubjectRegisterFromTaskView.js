import React from 'react';
import Path from "../../framework/routing/Path";
import AbstractComponent from "../../framework/view/AbstractComponent";
import RegisterView from "../RegisterView";

@Path('/subjectRegisterFromTaskView')
class SubjectRegisterFromTaskView extends AbstractComponent {
    constructor(props, context) {
        super(props, context);
    }

    render() {
        return <RegisterView hideBackButton={false}/>;
    }
}

export default SubjectRegisterFromTaskView;
