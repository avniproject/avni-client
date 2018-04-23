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
import General from "../../utility/General";
import DGS from "../primitives/DynamicGlobalStyles";
import Styles from "../primitives/Styles";
import EntityTypeSelector from "./EntityTypeSelector";

class IndividualProfile extends AbstractComponent {
    static propTypes = {
        individual: React.PropTypes.object.isRequired,
        viewContext: React.PropTypes.string.isRequired,
        programsAvailable: React.PropTypes.bool,
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
    }

    componentWillMount() {
        return super.componentWillMount();
    }

    componentDidMount() {
        setTimeout(() => this.dispatchAction(Actions.INDIVIDUAL_SELECTED, {value: this.props.individual}), 300);
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

    renderProfileActionButton(iconMode, displayTextMessageKey, onPress) {
        return (<TouchableNativeFeedback onPress={onPress}>
            <View style={{
                flexDirection: 'row', height: DGS.resizeHeight(30), borderColor: Styles.accentColor, borderWidth: 1,
                borderStyle: 'solid', borderRadius: 2, paddingHorizontal: DGS.resizeWidth(6),
                alignItems: 'center', justifyContent: 'flex-start', marginHorizontal: 4
            }}>
                <Icon name={iconMode} style={{
                    fontSize: DGS.resizeWidth(Styles.programProfileButtonText.fontSize),
                    color: Colors.DarkPrimaryColor,
                    paddingRight: 4
                }}/>
                <Text style={Styles.programProfileButtonText}>{this.I18n.t(displayTextMessageKey)}</Text>
            </View>
        </TouchableNativeFeedback>);
    }

    render() {
        General.logDebug('IndividualProfile', 'render');
        return this.props.viewContext !== IndividualProfile.viewContext.Wizard ?
            (
                <View style={{
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    marginVertical: 28,
                    backgroundColor: Styles.defaultBackground
                }}>
                    <EntityTypeSelector entityTypes={this.state.entityTypes} flowState={this.state.flowState}
                                        selectedEntityType={this.state.entity.program}
                                        actions={Actions} labelKey='selectProgram'
                                        onEntityTypeSelectionConfirmed={(newState) => CHSNavigator.navigateToProgramEnrolmentView(this, newState.entity)}/>
                    <View style={{justifyContent: 'center', alignSelf: 'center'}}>
                        <Icon name='person-pin' style={{
                            justifyContent: 'center',
                            alignSelf: 'stretch',
                            fontSize: DGS.resizeWidth(75),
                            color: Colors.AccentColor
                        }}/>
                    </View>
                    <Text
                        style={Styles.programProfileHeading}>{this.props.individual.nameString} {this.props.individual.id}</Text>
                    <Text
                        style={Styles.programProfileSubheading}>{this.I18n.t(this.props.individual.gender.name)}, {this.props.individual.getDisplayAge(this.I18n)}, {this.I18n.t(this.props.individual.lowestAddressLevel.name)}</Text>
                    <View style={{flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', paddingTop: 16}}>
                        {this.props.viewContext === IndividualProfile.viewContext.Individual ?
                            this.renderProfileActionButton('mode-edit', 'editProfile', () => {
                                this.editProfile()
                            }) :
                            this.renderProfileActionButton('person', 'viewProfile', () => {
                                this.viewProfile()
                            })
                        }
                        {this.props.programsAvailable ? this.renderProfileActionButton('add', 'enrolInProgram', () => this.launchChooseProgram()) : null}
                        {this.props.viewContext !== IndividualProfile.viewContext.General ? this.renderProfileActionButton('mode-edit', 'generalHistory', () => this.viewGeneralHistory()) :
                            <View/>}
                        {this.renderViewEnrolmentsIfNecessary()}
                    </View>
                </View>

            ) :
            (
                <View style={this.appendedStyle({
                    flexDirection: 'column', backgroundColor: Colors.defaultBackground,
                    paddingHorizontal: Distances.ContentDistanceFromEdge
                })}>
                    <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                        <Text style={Fonts.LargeBold}>{this.props.individual.nameString}</Text>
                        <Text
                            style={Fonts.LargeRegular}>{this.I18n.t(this.props.individual.lowestAddressLevel.name)}</Text>
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