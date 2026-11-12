import React from "react";
import {Alert, Button, StyleSheet, TouchableOpacity, View} from "react-native";
import PropTypes from "prop-types";
import Icon from "react-native-vector-icons/MaterialIcons";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Colors from "../primitives/Colors";
import Distances from "../primitives/Distances";

// The ways a person's registration starts when ABHA is on, each with its help text behind an info icon: verify the
// ABHA the patient has (Avni's own screens), or create one (Eka's screens). There is no Register Without ABHA
// option: the form below is already open for a patient with no ABHA, and no NHA case asks for one (removed 4 Nov 2026).
class AbhaRegistrationOptions extends AbstractComponent {
    static propTypes = {
        onVerify: PropTypes.func.isRequired,
        onCreate: PropTypes.func.isRequired,
    };

    constructor(props, context) {
        super(props, context);
    }

    renderOption(titleKey, helpKey, onPress) {
        return (
            <View style={styles.option} key={titleKey}>
                <View style={styles.button}>
                    <Button title={this.I18n.t(titleKey)} color={Colors.ActionButtonColor} onPress={onPress}/>
                </View>
                <TouchableOpacity style={styles.info} onPress={() => Alert.alert(this.I18n.t(titleKey), this.I18n.t(helpKey))}>
                    <Icon name="info-outline" size={24} color={Colors.ActionButtonColor}/>
                </TouchableOpacity>
            </View>
        );
    }

    render() {
        const {onVerify, onCreate} = this.props;
        return (
            <View style={{marginTop: Distances.ScaledVerticalSpacingBetweenFormElements}}>
                {this.renderOption('abhaOptionVerify', 'abhaOptionVerifyHelp', onVerify)}
                {this.renderOption('abhaOptionCreate', 'abhaOptionCreateHelp', onCreate)}
            </View>
        );
    }
}

const styles = StyleSheet.create({
    option: {flexDirection: 'row', alignItems: 'center', marginBottom: 8},
    button: {flex: 1},
    info: {paddingLeft: 12, paddingVertical: 4},
});

export default AbhaRegistrationOptions;
