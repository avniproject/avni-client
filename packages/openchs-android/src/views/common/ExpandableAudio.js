import PropTypes from 'prop-types';
import React from 'react';
import {Modal, StyleSheet, TouchableNativeFeedback, View} from "react-native";
import Colors from "../primitives/Colors";
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import VideoPlayerWrapper from "../videos/VideoPlayerWrapper";

export default class ExpandableAudio extends React.Component {
    static propTypes = {
        source: PropTypes.string,
    };

    constructor(props) {
        super(props);
        this.state = {showModal: false};
    }

    showModal() {
        this.setState({showModal: true});
    }

    hideModal() {
        this.setState({showModal: false});
    }

    render() {
        const sourceFile = `file://${this.props.source}`;
        return <View>
            <TouchableNativeFeedback onPress={() => this.showModal()}>
                <View style={styles.previewContainer}>
                    <Icon name={'headphones'} style={styles.playIconStyle}/>
                </View>
            </TouchableNativeFeedback>
            {this.state.showModal && (
                <Modal onRequestClose={() => this.hideModal()} style={{height: '100%'}}>
                    <VideoPlayerWrapper uri={sourceFile} onClose={() => this.hideModal()}/>
                </Modal>
            )}
        </View>
    }
}

const styles = StyleSheet.create({
    previewContainer: {
        backgroundColor: Colors.BlackBackground,
        alignItems: 'center',
        justifyContent: 'center',
        height: 36,
        width: 36,
        opacity: 0.8,
    },
    playIconStyle: {
        color: Colors.headerIconColor,
        fontSize: 20
    }
});
