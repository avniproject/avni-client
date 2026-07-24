import React from 'react';
import AbstractComponent from "../../framework/view/AbstractComponent";
import Reducers from "../../reducer";
import {StyleSheet, Text, TouchableNativeFeedback, View} from "react-native";
import Fonts from "../primitives/Fonts";
import {Actions} from "../../action/individual/IndividualGeneralHistoryActions";
import _ from "lodash";
import Colors from "../primitives/Colors";
import MCIcon from "react-native-vector-icons/MaterialCommunityIcons";

const styles = StyleSheet.create({
    floatingContainer: {
        position: 'absolute',
        right: 16,
        bottom: 24,
        zIndex: 10,
        elevation: 6
    },
    fabButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.BrandPrimaryDark,
        borderRadius: 24,
        paddingVertical: 10,
        paddingHorizontal: 18,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.2,
        shadowRadius: 4
    }
});

class NewFormButton extends AbstractComponent {

    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.individualGeneralHistory);
    }

    renderButton(onPress, text, index) {
        return (
            <TouchableNativeFeedback onPress={onPress} key={index}>
                <View style={styles.fabButton}>
                    <MCIcon name='plus' size={20} color={Colors.TextOnPrimaryColor}/>
                    <Text style={{
                        fontSize: Fonts.Medium,
                        color: Colors.TextOnPrimaryColor,
                        paddingLeft: 6
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
        return this.renderButton(() => this.startEncounter(), this.I18n.t('newGeneralVisit'))
    }

    renderEncounterNameButton(encounterAction) {
        return this.renderButton(() => encounterAction.fn(), this.I18n.t(encounterAction.label))
    }

    renderButtonBasedOnEncounters() {
        return _.size(this.state.encounterActions) === 1 ? this.renderEncounterNameButton(_.head(this.state.encounterActions)) : this.renderNewFormButton()
    }

    renderOption() {
        const containerStyle = [styles.floatingContainer, this.props.style || {}];
        const availableActions = _.size(this.state.encounterActions);
        return ( availableActions > 0 ?
            <View style={containerStyle}>
                {this.renderButtonBasedOnEncounters()}
            </View> : <View/>
        )
    }

    render() {
        return this.props.display ? this.renderOption() : null
    }


}

export default NewFormButton
