import React from 'react';
import AbstractComponent from "../../framework/view/AbstractComponent";
import Reducers from "../../reducer";
import {Text, TouchableNativeFeedback, View} from "react-native";
import Fonts from "../primitives/Fonts";
import {Actions} from "../../action/individual/IndividualGeneralHistoryActions";
import _ from "lodash";
import Styles from "../primitives/Styles";
import Colors from "../primitives/Colors";

class NewFormButton extends AbstractComponent {

    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.individualGeneralHistory);
    }

    renderButton(onPress, buttonStyle, text, textColor, index) {
        return (
            <TouchableNativeFeedback onPress={onPress} key={index}>
                <View style={buttonStyle}>
                    <Text style={{
                        fontSize: Fonts.Medium,
                        color: textColor,
                        paddingHorizontal: 10
                    }}>{text}</Text>
                </View>
            </TouchableNativeFeedback>
        );
    }

    startEncounter() {
        this.dispatchAction(Reducers.STATE_CHANGE_POSSIBLE_EXTERNALLY);
        this.dispatchAction(Actions.LAUNCH_ENCOUNTER_SELECTOR);
    }

    renderNewFormButton() {
        return this.renderButton(() => this.startEncounter(), Styles.basicPrimaryButtonView, this.I18n.t('newGeneralVisit'), Colors.TextOnPrimaryColor)
    }

    renderEncounterNameButton(encounterAction) {
        return this.renderButton(() => encounterAction.fn(this.props.currentView), Styles.basicPrimaryButtonView, this.I18n.t(encounterAction.label), Colors.TextOnPrimaryColor)
    }

    renderButtonBasedOnEncounters() {
        return _.size(this.state.encounterActions) === 1 ? this.renderEncounterNameButton(_.head(this.state.encounterActions)) : this.renderNewFormButton()
    }

    renderOption() {
        const containerStyle = this.props.style || {};
        const availableActions = _.size(this.state.encounterActions);
        return (
            <View style={containerStyle}>
                <View style={{marginTop: 2, position: 'absolute', right: 8}}>
                    {availableActions > 0 ? this.renderButtonBasedOnEncounters() : <View/>}
                </View>
            </View>
        )
    }

    render() {
        return this.props.display ? this.renderOption() : null
    }


}

export default NewFormButton
