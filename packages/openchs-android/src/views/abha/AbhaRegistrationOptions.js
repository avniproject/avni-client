import React from "react";
import {Alert, Button, StyleSheet, TouchableOpacity, View} from "react-native";
import PropTypes from "prop-types";
import Icon from "react-native-vector-icons/MaterialIcons";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Colors from "../primitives/Colors";
import Distances from "../primitives/Distances";

// The three ways a person's registration starts when ABHA is on, each with its help text behind an info icon.
class AbhaRegistrationOptions extends AbstractComponent {
    static propTypes = {
        onCreate: PropTypes.func.isRequired,
        onLink: PropTypes.func.isRequired,
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
        const {onCreate, onLink, onWithout} = this.props;
        return (
            <View style={{marginTop: Distances.ScaledVerticalSpacingBetweenFormElements}}>
                {this.renderOption('abhaOptionCreate', 'abhaOptionCreateHelp', onCreate)}
                {this.renderOption('abhaOptionLink', 'abhaOptionLinkHelp', onLink)}
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
