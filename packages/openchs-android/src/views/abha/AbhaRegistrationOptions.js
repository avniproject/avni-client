import React from "react";
import {Alert, Button, StyleSheet, TouchableOpacity, View} from "react-native";
import PropTypes from "prop-types";
import Icon from "react-native-vector-icons/MaterialIcons";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Colors from "../primitives/Colors";
import Distances from "../primitives/Distances";

// The two ways a person's registration starts when ABHA is on, each with its help text behind an info icon. Eka's
// screens find the ABHA a patient already has, or create one, so a single option starts both.
class AbhaRegistrationOptions extends AbstractComponent {
    static propTypes = {
        onFindOrCreate: PropTypes.func.isRequired,
        onWithout: PropTypes.func.isRequired,
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
        const {onFindOrCreate, onWithout} = this.props;
        return (
            <View style={{marginTop: Distances.ScaledVerticalSpacingBetweenFormElements}}>
                {this.renderOption('abhaOptionFindOrCreate', 'abhaOptionFindOrCreateHelp', onFindOrCreate)}
                {this.renderOption('abhaOptionWithout', 'abhaOptionWithoutHelp', onWithout)}
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
