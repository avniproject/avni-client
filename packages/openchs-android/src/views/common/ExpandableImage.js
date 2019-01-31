import React from 'react';
import {Image, Modal, TouchableNativeFeedback, View} from "react-native";
import {ImageViewer} from "react-native-image-zoom-viewer";

export default class ExpandableImage extends React.Component {
    constructor(props) {
        super(props);
        this.state = {showModal: false};
    }

    static propTypes = {
        source: React.PropTypes.string,
    };

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
                <Image source={{uri: sourceFile}} style={{height: 36, width: 36}}/>
            </TouchableNativeFeedback>
            {this.state.showModal && (
                <Modal onRequestClose={() => this.hideModal()}>
                    <ImageViewer imageUrls={[{
                        url: sourceFile
                    }]}
                    />
                </Modal>
            )}
        </View>
    }
}
