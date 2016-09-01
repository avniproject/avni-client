import  {StyleSheet, Text, View} from 'react-native';
import React, {Component} from 'react';
import TypedTransition from '../../framework/routing/TypedTransition';
import SettingsView from './../settings/SettingsView';
import MessageService from '../../service/MessageService';

class QuestionnaireNavigationMenu extends Component {
    static contextTypes = {
        navigator: React.PropTypes.func.isRequired,
        getService: React.PropTypes.func.isRequired
    };

    static styles = StyleSheet.create({
        button: {
            textAlign: 'left'
        }
    });

    constructor(props, context) {
        super(props, context);
        this.I18n = context.getService(MessageService).getI18n();
    }

    goToSettings = () => {
        TypedTransition.from(this).to(SettingsView);
    };

    render() {
        return (
            <View>
                <Text style={QuestionnaireNavigationMenu.styles.button} onPress={this.goToSettings}>
                    {this.I18n.t('settings')}
                </Text>
            </View>
        );
    }
}

export default QuestionnaireNavigationMenu;