import React, {Component} from 'react';
import {
    StyleSheet,
    View,
    Modal,
    ActivityIndicator
} from 'react-native';
import Config from "../framework/Config";
import EnvironmentConfig from "../framework/EnvironmentConfig";

const CustomActivityIndicator = props => {
    const {
        loading,
        ...attributes
    } = props;

    // The full screen level modal indicator doesn't go away on reload screen, from previous ,load, which means app has to be restarted
    if (EnvironmentConfig.isDevMode()) {
        return null;
    }

    return (
        <Modal transparent={true} animationType={'none'} visible={loading}>
            <View style={styles.modalBackground}>
                <View style={styles.activityIndicatorWrapper}>
                    <ActivityIndicator animating={loading}/>
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
