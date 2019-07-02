import PropTypes from 'prop-types';
import {View, Alert, TouchableNativeFeedback} from "react-native";
import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import {Icon, Text} from "native-base";
import {Actions} from "../../action/individual/IndividualProfileActions";
import Reducers from "../../reducer";
import Colors from "../primitives/Colors";
import Distances from "../primitives/Distances";
import Fonts from "../primitives/Fonts";
import CHSNavigator from "../../utility/CHSNavigator";
import General from "../../utility/General";
import DGS from "../primitives/DynamicGlobalStyles";
import Styles from "../primitives/Styles";
import ActionSelector from "./ActionSelector";
import _ from "lodash";
import {ProgramEnrolment, WorkLists, WorkList, WorkItem} from "openchs-models";

class IndividualProfile extends AbstractComponent {
    static propTypes = {
        individual: PropTypes.object.isRequired,
        viewContext: PropTypes.string,
        programsAvailable: PropTypes.bool,
        hideEnrol: PropTypes.bool,
        style: PropTypes.object
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
        setTimeout(() => this.dispatchAction(Actions.INDIVIDUAL_SELECTED, {individual: this.props.individual}), 300);
    }

    renderViewEnrolmentsIfNecessary() {
        if (this.props.individual.hasEnrolments && this.props.viewContext !== IndividualProfile.viewContext.Program) {
            return this.renderProfileActionButton('view-module', 'enrolments', () => this.viewEnrolments())
        }
    }


    programProfileHeading() {
        return this.props.individual.subjectType.isIndividual() ?
            <Text
                style={Styles.programProfileSubheading}>{this.I18n.t(this.props.individual.gender.name)}, {this.props.individual.getAgeAndDateOfBirthDisplay(this.I18n)}, {this.I18n.t(this.props.individual.lowestAddressLevel.name)}</Text> :
            <Text
                style={Styles.programProfileSubheading}>{this.I18n.t(this.props.individual.lowestAddressLevel.name)}</Text>
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
        const programActions = this.state.eligiblePrograms.map(program => ({
            fn: () => {
                const enrolment = ProgramEnrolment.createEmptyInstance({
                    individual: this.props.individual,
                    program: program
                });
                CHSNavigator.navigateToProgramEnrolmentView(this, enrolment, new WorkLists(new WorkList('Enrol', [
                    new WorkItem(General.randomUUID(), WorkItem.type.PROGRAM_ENROLMENT, {
                        programName: program.name,
                        subjectUUID: this.props.individual.uuid
                    })
                ])));
            },
            label: program.displayName,
            backgroundColor: program.colour,
        }));

        return this.props.viewContext !== IndividualProfile.viewContext.Wizard ?
            (
                <View style={{
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    marginVertical: 28,
                    backgroundColor: Styles.defaultBackground
                }}>
                    <ActionSelector
                        title={this.I18n.t("enrolInProgram")}
                        hide={() => this.dispatchAction(Actions.HIDE_ACTION_SELECTOR)}
                        visible={this.state.displayActionSelector}
                        actions={programActions}
                    />
                    <View style={{justifyContent: 'center', alignSelf: 'center'}}>
                        <Icon name={this.props.individual.icon()} style={{
                            justifyContent: 'center',
                            alignSelf: 'stretch',
                            fontSize: DGS.resizeWidth(75),
                            color: Colors.AccentColor
                        }}/>
                    </View>
                    <Text
                        style={Styles.programProfileHeading}>{this.props.individual.nameString} {this.props.individual.id}</Text>
                    {this.programProfileHeading()}
                    <View style={{flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', paddingTop: 16}}>
                        {(!this.props.hideEnrol && !_.isEmpty(this.state.eligiblePrograms)) ? this.renderProfileActionButton('add', 'enrolInProgram', () => this.launchChooseProgram()) : null}
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
                    {
                        this.props.individual.subjectType.isIndividual() ?
                            <View style={{flexDirection: 'row'}}>
                                <Text style={{fontSize: Fonts.Normal}}>
                                    {this.I18n.t(this.props.individual.gender.name)}, {this.props.individual.getAge().toString(this.I18n)}</Text>
                            </View> : <View/>
                    }
                </View>
            );
    }

    viewEnrolments() {
        CHSNavigator.navigateToProgramEnrolmentDashboardView(this, this.props.individual.uuid);
    }

    launchChooseProgram() {
        this.dispatchAction(Actions.LAUNCH_ACTION_SELECTOR);
    }


}

export default IndividualProfile;
