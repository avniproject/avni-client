import React from 'react';
import {StyleSheet, TouchableOpacity, Linking, AsyncStorage, View, Text} from "react-native";
import AbstractComponent from "../../framework/view/AbstractComponent";
import SettingsService from "../../service/SettingsService";
import AuthService from "../../service/AuthService";
import moment from "moment";
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

class YearReviewBanner extends AbstractComponent {
    constructor(props, context) {
        super(props, context);
        this.state = {show: false, token: undefined}
    }

    async UNSAFE_componentWillMount() {
        const openedOn = await AsyncStorage.getItem('openedOn');
        const token = await this.getService(AuthService).getAuthToken();
        const openedTime = openedOn && moment(openedOn) || moment();
        const after48Hr = moment(openedTime).add(48, "hours");
        const show = moment().isSameOrBefore('2022-01-15', "d") && moment().isSameOrBefore(after48Hr);
        this.setState({token, show});
    }

    onClick(serverURL) {
        AsyncStorage.setItem('openedOn', moment().toISOString());
        Linking.openURL(`${serverURL}/userReview?AUTH-TOKEN=${this.state.token}`)
    }

    render() {
        const serverURL = this.getService(SettingsService).getSettings().serverURL;
        return (
            this.state.show ? <TouchableOpacity
                onPress={() => this.onClick(serverURL)}>
                <View style={{height: 80}}>
                    <View style={styles.container}>
                        <Text style={styles.headerContainer}>{this.I18n.t('yearInAvni')}</Text>
                    </View>
                    <View style={styles.footerContainer}>
                        <View style={{flex: 0.2}}>
                            <Icon style={styles.iconStyle} name='trophy-outline'/>
                        </View>
                        <View style={{flex: 0.8}}>
                            <Text style={{color:'#f1fbf8'}}>{this.I18n.t('msg1')}</Text>
                            <Text style={{color:'#f1fbf8'}}>{this.I18n.t('msg2')}</Text>
                        </View>
                    </View>
                </View>
            </TouchableOpacity> : null
        )
    }
}

const styles = StyleSheet.create({
    container: {
        height: 40,
        padding: 5,
        backgroundColor: '#aacf4f',
    },
    headerContainer: {
        fontSize: 25,
        opacity: 0.8,
        fontWeight: 'bold',
        fontStyle: 'normal',
        color: '#f1fbf8',
        textAlignVertical: 'center',
        alignSelf: 'center'
    },
    footerContainer: {
        height: 40,
        padding: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#aacf4f'
    },
    iconStyle: {
        alignSelf: 'center',
        fontSize: 40,
        color:'#e5efec',
    }
});
export {YearReviewBanner}
