import PropTypes from 'prop-types';
import React from "react";
import {Text, TouchableNativeFeedback, View, ToastAndroid} from "react-native";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Path from "../../framework/routing/Path";
import {StartProgramActionsNames as Actions} from "../../action/program/StartProgramActions"
import PresetOptionItem from "../primitives/PresetOptionItem";
import Reducers from "../../reducer/index";
import Styles from "../primitives/Styles";
import CHSNavigator from "../../utility/CHSNavigator";
import moment from "moment";
import CHSContainer from "../common/CHSContainer";
import CHSContent from "../common/CHSContent";
import AppHeader from "../common/AppHeader";
import themes from "../primitives/themes";
import Distances from "../primitives/Distances";
import General from "../../utility/General";

@Path('/StartProgramView')
class StartProgramView extends AbstractComponent {

    static propTypes = {
        params: PropTypes.object.isRequired,
    };

    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.startProgramActions);
    }

    viewName() {
        return "StartProgramView";
    }

    componentWillMount() {
        this.dispatchAction(Actions.ON_LOAD, this.props.params);
        return super.componentWillMount();
    }

    renderOption(option, idx) {
        return option ? <PresetOptionItem displayText={option.label}
                                          checked={option.selected}
                                          multiSelect={false}
                                          onPress={() => this.dispatchAction(Actions.ON_SELECTION_CHANGE, option)}
                                          key={idx}
                                          style={{paddingTop: Styles.VerticalSpacingBetweenOptionItems, flex: 0.5,
                                              paddingRight: Distances.HorizontalSpacingBetweenOptionItems}}/>
            : <View key={idx} style={{flex: 0.5}}/>;
    }

    renderRadioGroup(heading, items) {
        if (!_.isEmpty(items)) {
            return (
                <View style={{
                    paddingHorizontal: Styles.ContentDistanceFromEdge,
                    paddingVertical: Styles.VerticalSpacingBetweenOptionItems,
                    marginVertical: Styles.VerticalSpacingBetweenFormElements,
                    backgroundColor: '#ffffff',
                    borderWidth: 1,
                    borderStyle: 'dashed',
                    borderRadius: 1,
                    borderColor: Styles.InputBorderNormal,
                }}>
                    <Text style={Styles.formGroupLabel}>{heading}</Text>
                    {_.chunk(items, 2).map((options, idx) => {
                        return (
                            <View style={{flexDirection: 'row'}} key={idx}>
                                {options.map(this.renderOption.bind(this))}
                            </View>
                        )
                    })}
                </View>

            );
        }
    }

    proceed() {
        if (!this.state.selectedEncounter) {
            ToastAndroid.showWithGravity(this.I18n.t("pleaseChooseAOption"), ToastAndroid.SHORT, ToastAndroid.TOP);
            return;
        };

        let programEncounter = this.state.selectedEncounter.cloneForEdit();
        programEncounter.encounterDateTime = moment().toDate();
        CHSNavigator.navigateToProgramEncounterView(this, programEncounter);
    }

    renderConjunction(previousList) {
        if (_.isEmpty(previousList)) return;
        return <Text style={[{alignSelf: 'center'}, Styles.formGroupLabel]}>{this.I18n.t("or")}</Text>
    }

    render() {
        General.logDebug(this.viewName(), 'render');

        return (
            <CHSContainer theme={themes}>
                <CHSContent>
                    <AppHeader title={this.I18n.t("chooseVisit")}/>

                    <View style={{paddingHorizontal: Styles.ContentDistanceFromEdge,
                        paddingVertical: Styles.VerticalSpacingBetweenFormElements}}>

                        {this.renderRadioGroup(this.I18n.t("plannedVisits"), this.state.encounters)}

                        {!this.state.hideUnplanned ? this.renderConjunction(this.state.encounters): <View/>}

                        {!this.state.hideUnplanned ? this.renderRadioGroup(this.I18n.t("unplannedVisits"), this.state.encounterTypes) : <View/>}

                        <View style={{flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16}}>
                            <TouchableNativeFeedback onPress={() => { CHSNavigator.goBack(this) }}
                                                     background={TouchableNativeFeedback.SelectableBackground()}>
                                <View style={Styles.basicSecondaryButtonView}>
                                    <Text style={{color: Styles.blackColor, fontSize: 16}}>{this.I18n.t("cancel")}</Text>
                                </View>
                            </TouchableNativeFeedback>

                            <TouchableNativeFeedback onPress={() => { this.proceed() }}
                                                     background={TouchableNativeFeedback.SelectableBackground()}>
                                <View style={[Styles.basicPrimaryButtonView, {marginHorizontal: 16, }]}>
                                    <Text style={{color: Styles.whiteColor, fontSize: 16}}>{this.I18n.t("proceed")}</Text>
                                </View>
                            </TouchableNativeFeedback>
                        </View>
                    </View>
                </CHSContent>
            </CHSContainer>
        );
    }
}

export default StartProgramView;
