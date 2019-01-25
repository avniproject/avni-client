import React from 'react';
import {Image, Modal, TouchableNativeFeedback, View} from "react-native";
import FileSystem from "../../model/FileSystem";
import VideoPlayerWrapper from "../videos/VideoPlayerWrapper";

export default class ExpandableVideo extends React.Component {
    constructor(props) {
        super(props);
    }

    static propTypes = {
        source: React.PropTypes.string,
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
        const sourceFile = `file://${FileSystem.getVideosDir()}/${this.props.source}`.trim();
        return <View>
            <TouchableNativeFeedback onPress={() => this.showModal()}>
                <Image source={{uri: sourceFile}} style={{height: 60, width: 80}}/>
            </TouchableNativeFeedback>
            {this.state.expanded && (
                <Modal onRequestClose={() => this.hideModal()} style={{height: '100%'}}>
                    <VideoPlayerWrapper uri={sourceFile} onClose={() => this.hideModal()}/>
                </Modal>
            )}
        </View>
    }
}