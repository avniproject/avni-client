import TypedTransition from "../../framework/routing/TypedTransition";
import {View, StyleSheet} from "react-native";
import React, {Component} from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import {Button} from "native-base";
import Path from "../../framework/routing/Path";
import Reducers from "../../reducer";
import Colors from "../primitives/Colors";
import DGS from "../primitives/DynamicGlobalStyles";
import CHSNavigator from "../../utility/CHSNavigator";
import {
    ProgramEncounterTypeChoiceActionNames,
    EncounterTypeChoiceActionNames
} from "../../action/program/ProgramEnrolmentDashboardActions";
import GrowthChartView from "./GrowthChartView";
import * as _ from "lodash";

@Path('/ProgramActionsView')
class ProgramActionsView extends AbstractComponent {
    constructor(props, context){
        super(props, context, "something");
        this.goToView = this.goToView.bind(this);
    }
    static propTypes = {
        programDashboardButtons: React.PropTypes.array.isRequired,
        enrolment: React.PropTypes.object.isRequired,
    };

    startEncounter() {
        this.dispatchAction(Reducers.STATE_CHANGE_POSSIBLE_EXTERNALLY);
        this.dispatchAction(EncounterTypeChoiceActionNames.LAUNCH_CHOOSE_ENTITY_TYPE);
    }

    startProgramEncounter() {
        this.dispatchAction(ProgramEncounterTypeChoiceActionNames.LAUNCH_CHOOSE_ENTITY_TYPE);
    }

    openChecklist() {
        CHSNavigator.navigateToChecklistView(this, this.props.enrolment.uuid);
    }

    goToView(button) {
        TypedTransition.from(this).bookmark().with({data: _.get(button, ['openOnClick', 'data']), enrolment: this.props.enrolment}).to(GrowthChartView);
    }

    renderConfiguredButton(button) {
        return (
            <Button block
                    style={{height: DGS.resizeHeight(36), marginBottom: DGS.resizeHeight(8), backgroundColor: Colors.SecondaryActionButtonColor}}
                    textStyle={{color: 'black'}}
                    onPress={() => this.goToView(button)} key={button.label}>{button.label}</Button>
        );
    }

    render() {
        return (
            <View
                style={{flexDirection: 'column', flex: 1, justifyContent: 'flex-end', marginTop: DGS.resizeHeight(9)}}>
                {this.props.enrolment.isActive ?
                    <Button block
                            style={{height: DGS.resizeHeight(36), marginBottom: DGS.resizeHeight(8), backgroundColor: Colors.ActionButtonColor}}
                            textStyle={{color: 'white'}}
                            onPress={() => this.startProgramEncounter()}>{this.I18n.t('startProgramVisit')}</Button> :
                    <View/>}
                {this.props.enrolment.hasChecklist ?
                    <Button block
                            style={{height: DGS.resizeHeight(36), marginBottom: DGS.resizeHeight(8), backgroundColor: Colors.ActionButtonColor}}
                            textStyle={{color: 'white'}}
                            onPress={() => this.openChecklist()}>{this.I18n.t('openChecklist')}</Button> :
                    <View/>}
                <Button block
                        style={{height: DGS.resizeHeight(36), marginBottom: DGS.resizeHeight(8), backgroundColor: Colors.SecondaryActionButtonColor}}
                        textStyle={{color: Colors.BlackBackground}}
                        onPress={() => this.startEncounter()}>{this.I18n.t('startGeneralVisit')}</Button>
                {_.map(this.props.programDashboardButtons, (button) => this.renderConfiguredButton(button))}
            </View>
        );
    }
}

export default ProgramActionsView;