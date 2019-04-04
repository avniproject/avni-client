import FloatingActionButton, * as FAB from "../common/FloatingActionButton";
import {Text, TouchableOpacity} from "react-native";
import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import ProgramService from "../../service/program/ProgramService";
import Colors from "../primitives/Colors";
import IndividualRegisterViewsMixin from "./IndividualRegisterViewsMixin";
import EntityService from "../../service/EntityService";
import SubjectType from "openchs-models/src/SubjectType";

export default class RegistrationFAB extends AbstractComponent {
    static propTypes = {
        parent: React.PropTypes.object.isRequired
    };

    constructor(props, context) {
        super(props, context);
        this.createStyles();
        const subjectType = this.context.getService(EntityService).getAll(SubjectType.schema.name)[0];
        this.subjectType = subjectType;
    }

    componentWillMount() {
        const programs = this.context.getService(ProgramService).findAll();
        this.setState({programs: _.map(programs, _.identity)});
    }

    createStyles() {
    }

    get actions() {
        return this.state.programs.map(program => ({
            fn: () => IndividualRegisterViewsMixin.navigateToRegistrationThenProgramEnrolmentView(this, program, this.props.parent, this.subjectType),
            icon: FAB.Action(program.displayName[0], {backgroundColor: program.colour}),
            label: program.displayName,
        }));
    }

    get primaryAction() {
        return {
            fn: () => IndividualRegisterViewsMixin.navigateToRegistration(this, this.subjectType),
            icon: FAB.PrimaryAction(this.subjectType.name[0], {backgroundColor: Colors.AccentColor}),
            label: this.subjectType.name
        };
    }

    render() {
        return <FloatingActionButton actions={this.subjectType? this.actions: []} primaryAction={this.subjectType? this.primaryAction: {}}/>
    }

}


