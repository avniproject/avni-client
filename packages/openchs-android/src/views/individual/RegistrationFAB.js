import FloatingActionButton from "../common/FloatingActionButton";
import CHSNavigator from "../../utility/CHSNavigator";
import {Text} from "react-native";
import CHSContainer from "../common/CHSContainer";
import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import AuthService from "../../service/AuthService";
import ProgramService from "../../service/program/ProgramService";
import ProgramEnrolment from "openchs-models/src/ProgramEnrolment";
import ObservationsHolder from "openchs-models/src/ObservationsHolder";

export default class RegistrationFAB extends AbstractComponent {
    static propTypes = {
        parent: React.PropTypes.object.isRequired
    };

    constructor(props, context) {
        super(props, context);
    }

    componentWillMount() {
        const programs = this.context.getService(ProgramService).findAll();
        this.setState({programs: _.map(programs, _.identity)});
    }

    render() {
        return <FloatingActionButton actions={
            this.state.programs.map((program)=> {
                return {
                    fn: ()=> {
                        CHSNavigator.navigateToIndividualRegisterView(this, null, {
                            key: 'saveAndEnrol',
                            callback: (systemRecommendationView) => {
                                const individual = systemRecommendationView.state.individual;
                                const enrolment = ProgramEnrolment.createEmptyInstance();
                                enrolment.individual = individual.cloneForEdit();
                                enrolment.program = program;
                                ObservationsHolder.convertObsForSave(enrolment.individual.observations);
                                CHSNavigator.navigateToProgramEnrolmentView(source, enrolment);
                            }
                        });
                    },
                    icon: <Text>{program.name[0]}</Text>,
                    label: 'Registration ' + program.name
                }
            })
        }/>
    }

}


