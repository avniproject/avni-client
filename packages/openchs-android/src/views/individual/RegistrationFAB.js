import FloatingActionButton from "../common/FloatingActionButton";
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
        this.iconStyle = {
            alignSelf: 'flex-end',
            alignItems: 'center',
            justifyContent: 'center',
            width: 40,
            height: 40,
            borderRadius: 80,
            elevation: 2,
            marginBottom: 10,
            marginLeft: 6
        };
        this.textStyle = {
            color: Colors.TextOnPrimaryColor,
            fontFamily: 'FontAwesome',
            fontWeight: 'normal',
            textAlign: 'justify',
            lineHeight: 30,
            fontSize: 28,
            padding: 8,
        }
    }

    renderIcon(icon, style = {}) {
        return (<TouchableOpacity disabled={true} style={[style, this.iconStyle]}>
            <Text style={this.textStyle}>{icon}</Text>
        </TouchableOpacity>);
    }

    get actions() {
        const registrationAndEnrolmentActions = this.state.programs.map(program => ({
            fn: () => IndividualRegisterViewsMixin.navigateToRegistrationThenProgramEnrolmentView(this, program, this.props.parent, this.subjectType),
            icon: this.renderIcon(program.name[0], {backgroundColor: program.colour}),
            label: program.name,
        }));
        const registrationsAction = {
            fn: () => IndividualRegisterViewsMixin.navigateToRegistration(this, this.subjectType),
            icon: this.renderIcon('R', {backgroundColor: Colors.AccentColor}),
            label: this.subjectType.name
        };
        return _.concat([], [registrationsAction], registrationAndEnrolmentActions);
    }

    render() {
        return <FloatingActionButton actions={this.subjectType? this.actions: []}/>
    }

}


