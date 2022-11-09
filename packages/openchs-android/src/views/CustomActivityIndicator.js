import React, {Component} from 'react';
import {
    StyleSheet,
    View,
    Modal,
    ActivityIndicator
} from 'react-native';
import Config from "../framework/Config";

const CustomActivityIndicator = props => {
    const {
        loading,
        ...attributes
    } = props;

    // The App level activity indicator doesn't go away on reload screen, which means app has to be restarted
    const doNotShow = Config.ENV === 'dev' || Config.ENV === 'ext-dev';
    return (
        <Modal transparent={true} animationType={'none'} visible={loading}>
            <View style={styles.modalBackground}>
                <View style={styles.activityIndicatorWrapper}>
                    {!doNotShow && <ActivityIndicator animating={loading}/>}
                </View>
            </View>
        </Modal>
    )
};

const styles = StyleSheet.create({
    modalBackground: {
        flex: 1,
        alignItems: 'center',
        flexDirection: 'column',
        justifyContent: 'space-around',
        backgroundColor: '#00000090'
    },
    activityIndicatorWrapper: {
        backgroundColor: '#FFFFFF',
        height: 100,
        width: 100,
        borderRadius: 10,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around'
    }
});

export default CustomActivityIndicator;
