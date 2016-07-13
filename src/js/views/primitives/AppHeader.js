import {StyleSheet, Text, Image, View, TouchableHighlight, Navigator} from 'react-native';
import React, {Component} from 'react';
import TypedTransition from "../../framework/routing/TypedTransition";
import SettingsView from "../settings/SettingsView";
import I18n from '../../utility/Messages'

class AppHeader extends Component {
    static propTypes = {
        title: React.PropTypes.string.isRequired,
        onTitlePressed: React.PropTypes.func,
        parent: React.PropTypes.object.isRequired
    };

    static styles = StyleSheet.create({
        main: {
            backgroundColor: '#FF8A84',
            height: 60,
            flexDirection: 'row'
        },
        icon: {
            flex: 0.13,
            margin: 3,
            marginTop: 5
        },
        header: {
            color: '#FFFFFF',
            textAlignVertical: 'center',
            textAlign: 'center',
            fontWeight: 'bold',
            fontSize: 26
        }
    });

    onSettingsPress = () => {
        TypedTransition.from(this.props.parent).to(SettingsView, Navigator.SceneConfigs.FloatFromLeft);
    };

    render() {
        return (
            <View>
                <View style={AppHeader.styles.main}>
                    <TouchableHighlight style={AppHeader.styles.icon} onPress={this.onSettingsPress}>
                        <Image
                            source={require('../../../../android/app/src/main/res/mipmap-mdpi/settings_icon.png')}
                        />
                    </TouchableHighlight>
                    <TouchableHighlight onPress={this.props.onTitlePressed} style={{width: 50, flex: 1}}>
                        <Text style={AppHeader.styles.header}>{I18n.t(this.props.title)}</Text>
                    </TouchableHighlight>
                    <View style={AppHeader.styles.icon}>
                        <Image
                            source={require('../../../../android/app/src/main/res/mipmap-mdpi/mentalstate48.png')}
                        />
                    </View>
                </View>
            </View>
        );
    }
}

export default AppHeader;
