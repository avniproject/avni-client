import {StyleSheet, Text, View, TouchableHighlight, Image} from 'react-native';
import React, {Component} from 'react';
import TypedTransition from "../../framework/routing/TypedTransition";
import Colors from '../primitives/Colors';
import MessageService from '../../service/MessageService';
import QuestionnaireListView from '../questionnaireList/QuestionnaireListView';


class SettingsHeader extends Component {

    constructor(props, context) {
        super(props, context);
        this.I18n = context.getService(MessageService).getI18n();
    }

    static contextTypes = {
        getService: React.PropTypes.func.isRequired
    };

    static styles = StyleSheet.create({
        main: {
            flexDirection: 'row',
            height: 60,
            backgroundColor: Colors.Primary,
            flex: 1
        },
        labelWrapper: {
            flex: 0.9,
            flexDirection: 'row',
            justifyContent: 'flex-start'
        },
        label: {
            textAlignVertical: 'center',
            textAlign: 'center',
            color: '#ffffff',
            fontSize: 26,
            marginLeft: 14
        },
        closeWrapper: {
            marginRight: 10,
            flex: 0.1
        },
        close: {
            color: '#ffffff',
            fontSize: 32,
            textAlignVertical: 'center',
            textAlign: 'center',
            flex: 1
        }
    });

    static propTypes = {
        parent: React.PropTypes.object.isRequired
    };

    onClosePress = () => {
        TypedTransition.from(this.props.parent).to(QuestionnaireListView);
    };

    render() {
        return (
            <View style={SettingsHeader.styles.main}>
                <View style={SettingsHeader.styles.labelWrapper}>
                    <Image style={{marginLeft: 10}}
                           source={require('../../../../android/app/src/main/res/mipmap-mdpi/settings_50.png')}
                    />
                    <Text style={SettingsHeader.styles.labelKey}>
                        {this.I18n.t('settings')}
                    </Text>
                </View>
                <TouchableHighlight style={SettingsHeader.styles.closeWrapper}>
                    <Text style={SettingsHeader.styles.close} onPress={this.onClosePress}>
                        {this.I18n.t('close')}
                    </Text>
                </TouchableHighlight>
            </View>
        );
    }
}

export default SettingsHeader;