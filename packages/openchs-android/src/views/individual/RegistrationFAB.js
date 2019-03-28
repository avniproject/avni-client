import FloatingActionButton from "../common/FloatingActionButton";
import CHSNavigator from "../../utility/CHSNavigator";
import {Text, TouchableOpacity} from "react-native";
import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import ProgramService from "../../service/program/ProgramService";
import ProgramEnrolment from "openchs-models/src/ProgramEnrolment";
import ObservationsHolder from "openchs-models/src/ObservationsHolder";
import Colors from "../primitives/Colors";
import TypedTransition from "../../framework/routing/TypedTransition";
import SystemRecommendationView from "../conclusion/SystemRecommendationView";
import IndividualRegisterFormView from "./IndividualRegisterFormView";
import IndividualRegisterView from "./IndividualRegisterView";
import ProgramEnrolmentView from "../program/ProgramEnrolmentView";
import ProgramEnrolmentDashboardView from "../program/ProgramEnrolmentDashboardView";

export default class RegistrationFAB extends AbstractComponent {
    static propTypes = {
        parent: React.PropTypes.object.isRequired
    };

    constructor(props, context) {
        super(props, context);
        this.createStyles();
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
            backgroundColor: Colors.AccentColor,
            elevation: 2,
            marginBottom: 10,
            marginLeft: 6
        };
        this.textStyle = {
            color: Colors.TextOnPrimaryColor,
            fontFamily: 'FontAwesome',
            fontWeight: 'bold',
            textAlign: 'justify',
            lineHeight: 25,
            fontSize: 30,
            padding: 5,
        }
    }

    renderIcon(icon) {
        return (<TouchableOpacity disabled={true} style={this.iconStyle}>
            <Text style={this.textStyle}>{icon}</Text>
        </TouchableOpacity>);
    }

    navigateToMultipleRegistrations() {
        const onSaveCallback = (recommendationsView) => {
            TypedTransition
                .from(recommendationsView)
                .wizardCompleted([SystemRecommendationView, IndividualRegisterFormView],
                    IndividualRegisterView, {params:{onSaveCallback}}, true);
        };
        CHSNavigator.navigateToIndividualRegisterView(this, null, null, onSaveCallback);
    }

    navigateToRegistrationThenProgramEnrolmentView(program) {
        CHSNavigator.navigateToIndividualRegisterView(this, null, {
            label: 'saveAndEnrol',
            fn: recommendationView => this.navigateToProgramEnrolmentView(recommendationView.props.individual, program)
        })
    }

    navigateToProgramEnrolmentView(individual, program) {
        TypedTransition.from(this.props.parent).wizardCompleted(
            [SystemRecommendationView, IndividualRegisterFormView, IndividualRegisterView],
            ProgramEnrolmentView, {enrolment: ProgramEnrolment.createEmptyInstance({individual, program})}, true);
    }

    get actions() {
        const registrationAndEnrolmentActions = this.state.programs.map(program => ({
            fn: () => this.navigateToRegistrationThenProgramEnrolmentView(program),
            icon: this.renderIcon(program.name[0]),
            label: 'Registration ' + program.name
        }));
        const registrationsAction = {
            fn: () => this.navigateToMultipleRegistrations(),
            icon: this.renderIcon('R'),
            label: 'Registrations'
        };
        return _.concat([], [registrationsAction], registrationAndEnrolmentActions);
    }

    render() {
        return <FloatingActionButton actions={this.actions}/>
    }

}


