import  {StyleSheet, Text, View} from 'react-native';
import React, {Component} from 'react';
import TypedTransition from '../../routing/TypedTransition';
import SettingsView from './../settings/SettingsView';

class DiseaseNavigationMenu extends Component {

    static contextTypes = {
        navigator: React.PropTypes.func.isRequired
    };

    static styles = StyleSheet.create({
        button: {
            textAlign: 'left'
        }
    });

    goToSettings = () => {
        TypedTransition.from(this).to(SettingsView);
    };

    render() {
        return (
            <View>
                <Text style={DiseaseNavigationMenu.styles.button} onPress={this.goToSettings}>
                    Settings
                </Text>
            </View>
        );
    }
}

export default DiseaseNavigationMenu;