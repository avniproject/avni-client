import React, {Component, StyleSheet, Text, Image, View, TouchableHighlight, Navigator} from 'react-native';
import TypedTransition from "../../routing/TypedTransition";
import SettingsView from "../settings/SettingsView";

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
            flex: 1,
            flexDirection: 'row'
        },
        icon: {
            flex: 0.1,
            marginTop: 5
        },
        header: {
            color: '#FFFFFF',
            textAlignVertical: 'center',
            fontWeight: 'bold',
            fontSize: 26,
            width: 50,
            marginLeft: 100,
            flex: 0.8
        }
    });

    onSettingsPress = () => {
        TypedTransition.from(this.props.parent).to(SettingsView, Navigator.SceneConfigs.FloatFromLeft);
    };

    render() {
        return (
            <View style={AppHeader.styles.main}>
                <TouchableHighlight style={AppHeader.styles.icon} onPress={this.onSettingsPress}>
                    <Image
                        source={require('../../../../android/app/src/main/res/mipmap-mdpi/settings_icon.png')}
                    />
                </TouchableHighlight>
                <Text style={AppHeader.styles.header}
                      onTitlePressed={this.props.onTitlePressed}>{this.props.title}</Text>
                <View style={AppHeader.styles.icon}>
                    <Image
                        source={require('../../../../android/app/src/main/res/mipmap-mdpi/mentalstate48.png')}
                    />
                </View>
            </View>
        );
    }
}

export default AppHeader;
