import TypedTransition from "../../framework/routing/TypedTransition";
import {View, TouchableNativeFeedback, Text} from "react-native";
import PropTypes from 'prop-types';
import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Path from "../../framework/routing/Path";
import Reducers from "../../reducer";
import Colors from "../primitives/Colors";
import CHSNavigator from "../../utility/CHSNavigator";
import {ProgramEnrolmentDashboardActionsNames} from "../../action/program/ProgramEnrolmentDashboardActions";
import GrowthChartView from "./GrowthChartView";
import * as _ from "lodash";
import Fonts from "../primitives/Fonts";
import Styles from "../primitives/Styles";

@Path('/ProgramActionsView')
class ProgramActionsView extends AbstractComponent {
    constructor(props, context) {
        super(props, context, "something");
        this.goToView = this.goToView.bind(this);
    }

    static propTypes = {
        programDashboardButtons: PropTypes.array.isRequired,
        enrolment: PropTypes.object.isRequired,
        encounterTypes: PropTypes.array.isRequired
    };

    startEncounter() {
        this.dispatchAction(Reducers.STATE_CHANGE_POSSIBLE_EXTERNALLY);
        this.dispatchAction(ProgramEnrolmentDashboardActionsNames.LAUNCH_ENCOUNTER_SELECTOR);
    }

    startProgramEncounter() {
        CHSNavigator.navigateToStartProgramView(this, this.props.enrolment.uuid);
    }

    openChecklist() {
        CHSNavigator.navigateToChecklistView(this, this.props.enrolment.uuid);
    }

    goToView(button) {
        TypedTransition.from(this).bookmark().with({
            data: _.get(button, ['openOnClick', 'data'])(this.props.enrolment),
            enrolment: this.props.enrolment
        }).to(GrowthChartView);
    }

    renderButton(onPress, buttonStyle, text, textColor, index) {
        return (
            <TouchableNativeFeedback onPress={onPress} key={index}>
                <View style={buttonStyle}>
                    <Text style={{
                        fontSize: Fonts.Medium,
                        color: textColor
                    }}>{text.toUpperCase()}</Text>
                </View>
            </TouchableNativeFeedback>
        );
    }

    render() {
        return (
            <View
                style={{flex: 1, flexDirection: 'column', marginTop: 8}}>
                {_.isEmpty(this.props.encounterTypes) ? <View/> :
                    this.renderButton(() => this.startEncounter(), Styles.basicSecondaryButtonView,
                        this.I18n.t('newGeneralVisit'), Colors.DarkPrimaryColor)
                }
                {this.props.enrolment.isActive ?
                    this.renderButton(() => this.startProgramEncounter(), Styles.basicPrimaryButtonView,
                        this.I18n.t('newProgramVisit'), Colors.TextOnPrimaryColor)
                    :
                    <View/>}
                {this.props.enrolment.hasChecklist ?
                    this.renderButton(() => this.openChecklist(), Styles.basicPrimaryButtonView,
                        this.I18n.t('vaccinations'), Colors.TextOnPrimaryColor)
                    :
                    <View/>}
                {_.map(this.props.programDashboardButtons, (button, index) => this.renderButton(() => this.goToView(button),
                    Styles.basicPrimaryButtonView, this.I18n.t(button.label), Colors.TextOnPrimaryColor, index))}
            </View>
        );
    }
}

export default ProgramActionsView;