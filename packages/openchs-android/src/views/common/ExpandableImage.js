import PropTypes from 'prop-types';
import React from 'react';
import {Image, Modal, TouchableNativeFeedback, View} from "react-native";
import {ImageViewer} from "react-native-image-zoom-viewer";
import _ from 'lodash';

export default class ExpandableImage extends React.Component {
    constructor(props) {
        super(props);
        this.state = {showModal: false};
    }

    static propTypes = {
        source: PropTypes.string,
        allMediaAbsolutePath: PropTypes.array
    };

    static defaultProps = {
        allMediaAbsolutePath: [],
    };

    showModal() {
        this.setState({showModal: true});
    }

    hideModal() {
        this.setState({showModal: false});
    }

    render() {
        const mediaPath = !_.isEmpty(this.props.allMediaAbsolutePath) ? this.props.allMediaAbsolutePath : [this.props.source];
        const sourceFile = `file://${this.props.source}`;
        return <View>
            <TouchableNativeFeedback onPress={() => this.showModal()}>
                <Image source={{uri: sourceFile}} style={{height: 36, width: 36}}/>
            </TouchableNativeFeedback>
            {this.state.showModal && (
                <Modal onRequestClose={() => this.hideModal()}>
                    <ImageViewer imageUrls={_.map(mediaPath, path => ({url: `file://${path}`}))}
                    />
                </Modal>
            )}
        </View>
    }
}
