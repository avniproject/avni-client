import {View, TouchableNativeFeedback} from "react-native";
import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import {Icon, Text} from "native-base";
import TypedTransition from "../../framework/routing/TypedTransition";
import {Actions} from "../../action/individual/IndividualProfileActions";
import IndividualGeneralHistoryView from "../individual/IndividualGeneralHistoryView";
import Reducers from "../../reducer";
import Colors from "../primitives/Colors";
import Distances from "../primitives/Distances";
import Fonts from "../primitives/Fonts";
import CHSNavigator from "../../utility/CHSNavigator";
import EntityTypeSelector from "./EntityTypeSelector";
import General from "../../utility/General";

class IndividualProfile extends AbstractComponent {
    static propTypes = {
        individual: React.PropTypes.object.isRequired,
        viewContext: React.PropTypes.string.isRequired,
        style: React.PropTypes.object
    };

    static viewContext = {
        Program: 'Program',
        General: 'General',
        Wizard: 'Wizard',
        Individual: 'Individual'
    };

    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.individualProfile);
        this.buttonStyle = {height: 30, borderWidth: 1.5, justifyContent: 'center', flex: 1, alignItems: 'center'};
    }

    componentWillMount() {
        this.dispatchAction(Actions.INDIVIDUAL_SELECTED, {value: this.props.individual});
        return super.componentWillMount();
    }

    renderProfileActionButton(iconMode, displayTextMessageKey, onPress) {
        return <TouchableNativeFeedback onPress={onPress}>
            <View style={{flexDirection: 'row', backgroundColor: Colors.SecondaryActionButtonColor,
                borderRadius: 4, height: 36, width: 288, marginBottom: 8,
                alignItems: 'center', justifyContent: 'flex-start'}}>
                <Icon name={iconMode} style={{fontSize: 36, color: Colors.DarkPrimaryColor}}/>
                <Text style={{fontSize: Fonts.Medium, color: Colors.DarkPrimaryColor, flex: 1, alignSelf: 'center'}}>{this.I18n.t(displayTextMessageKey).toUpperCase()}</Text>
            </View>
            </TouchableNativeFeedback>
    }

    viewProfile() {
        CHSNavigator.navigateToIndividualRegistrationDetails(this, this.props.individual);
    }

    editProfile() {
        CHSNavigator.navigateToIndividualRegisterView(this, this.props.individual.uuid);
    }

    renderViewEnrolmentsIfNecessary() {
        if (this.props.individual.hasEnrolments && this.props.viewContext !== IndividualProfile.viewContext.Program) {
            return this.renderProfileActionButton('view-module', 'enrolments', () => this.viewEnrolments())
        }
    }

    render() {
        General.logDebug('IndividualProfile', 'render');
        return this.props.viewContext !== IndividualProfile.viewContext.Wizard ?
            (
                <View>
                    <EntityTypeSelector entityTypes={this.state.entityTypes} flowState={this.state.flowState} selectedEntityType={this.state.entity.program}
                                        actions={Actions} labelKey='selectProgram'
                                        onEntityTypeSelectionConfirmed={(newState) => CHSNavigator.navigateToProgramEnrolmentView(this, newState.entity)}/>
                    <View style={{flexDirection: 'row', height: 288, paddingVertical: 16}}>
                        <View style={{justifyContent: 'center'}}>
                            <Icon name='person-pin' style={{justifyContent: 'center', fontSize: 288, color: Colors.AccentColor}}/>
                        </View>
                        <View style={{flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between'}}>
                            <View>
                                <Text style={{fontSize: 24, alignSelf: 'center'}}>{this.props.individual.name} {this.props.individual.id}</Text>
                                <Text style={{fontSize: 15}}>{this.I18n.t(this.props.individual.gender.name)}, {this.props.individual.getDisplayAge(this.I18n)}, {this.props.individual.lowestAddressLevel.name}</Text>
                            </View>

                            <View style={{flexDirection: 'column', flex: 1, justifyContent: 'center'}}>
                                {this.props.viewContext === IndividualProfile.viewContext.Individual ?
                                    this.renderProfileActionButton('mode-edit', 'editProfile', () => {
                                        this.editProfile()
                                    }) :
                                    this.renderProfileActionButton('person', 'viewProfile', () => {
                                        this.viewProfile()
                                    })
                                }
                                {this.renderProfileActionButton('add', 'enrolInProgram', () => this.launchChooseProgram())}
                                {this.props.viewContext !== IndividualProfile.viewContext.General ? this.renderProfileActionButton('mode-edit', 'generalHistory', () => this.viewGeneralHistory()) : <View/>}
                                {this.renderViewEnrolmentsIfNecessary()}
                            </View>
                        </View>
                    </View>
                </View>
            ) :
            (
                <View style={this.appendedStyle({
                    flexDirection: 'column', backgroundColor: Colors.AccentColor,
                    paddingHorizontal: Distances.ContentDistanceFromEdge
                })}>
                    <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                        <Text style={Fonts.LargeBold}>{this.props.individual.name}</Text>
                        <Text style={Fonts.LargeRegular}>{this.props.individual.lowestAddressLevel.name}</Text>
                    </View>
                    <View style={{flexDirection: 'row'}}>
                        <Text style={{fontSize: Fonts.Normal}}>
                            {this.I18n.t(this.props.individual.gender.name)}, {this.props.individual.getAge().toString(this.I18n)}</Text>
                    </View>
                </View>
            );
    }

    viewEnrolments() {
        CHSNavigator.navigateToProgramEnrolmentDashboardView(this, this.props.individual.uuid);
    }

    launchChooseProgram() {
        this.dispatchAction(Actions.LAUNCH_CHOOSE_ENTITY_TYPE);
    }

    viewGeneralHistory() {
        TypedTransition.from(this).with({individualUUID: this.props.individual.uuid}).to(IndividualGeneralHistoryView);
    }
}

export default IndividualProfile;