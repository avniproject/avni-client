import React from 'react';
import Path from "../../framework/routing/Path";
import AbstractComponent from "../../framework/view/AbstractComponent";
import RegisterView from "../RegisterView";
import PropTypes from "prop-types";

@Path('/subjectRegisterFromTaskView')
class SubjectRegisterFromTaskView extends AbstractComponent {
    static propTypes = {
        params: PropTypes.object.isRequired
    }

    constructor(props, context) {
        super(props, context);
    }

    render() {
        return <RegisterView hideBackButton={false} taskUuid={this.props.params.taskUuid}/>;
    }
}

export default SubjectRegisterFromTaskView;
