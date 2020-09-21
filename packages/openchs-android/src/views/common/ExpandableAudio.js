import PropTypes from 'prop-types';
import React from 'react';
import {Image, Modal, TouchableNativeFeedback, View} from "react-native";
import ReactAudioPlayer from 'react-audio-player';

export default class ExpandableAudio extends React.Component {
    constructor(props) {
        super(props);
    }

    static propTypes = {
        source: PropTypes.string,
    };

    componentWillMount() {
        this.setState({expanded: false});
    }

    showModal() {
        this.setState({expanded: true});
    }

    hideModal() {
        this.setState({expanded: false});
    }

    render() {
        const sourceFile = `file://${this.props.source}`;
        return <View>
            <TouchableNativeFeedback onPress={() => this.showModal()}>
                <Image source={{uri: sourceFile}} style={{height: 50, width: 100}}/>
            </TouchableNativeFeedback>
            {this.state.expanded && (
                <Modal onRequestClose={() => this.hideModal()} style={{height: '100%'}}>
                    <ReactAudioPlayer src="my_audio_file.ogg"></ReactAudioPlayer>
                </Modal>
            )}
        </View>
    }
}