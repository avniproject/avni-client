import PropTypes from 'prop-types';
import React from 'react';
import {Image, Modal, StyleSheet, TouchableNativeFeedback, TouchableOpacity, View, Text} from "react-native";
import {ImageViewer} from "react-native-image-zoom-viewer";
import _ from 'lodash';
import I18n from "i18n-js";
import Colors from "../primitives/Colors";
import Styles from "../primitives/Styles";

export default class ExpandableImage extends React.Component {
    static propTypes = {
        source: PropTypes.string,
        allMediaAbsolutePath: PropTypes.array,
        fullWidth: PropTypes.bool,
    };
    static defaultProps = {
        allMediaAbsolutePath: [],
        fullWidth: false,
    };

    constructor(props) {
        super(props);
        this.state = {showModal: false, imageAspectRatio: 1};
    }

    showModal() {
        this.setState({showModal: true});
    }

    hideModal() {
        this.setState({showModal: false});
    }

    render() {
        const mediaPath = !_.isEmpty(this.props.allMediaAbsolutePath) ? this.props.allMediaAbsolutePath : [this.props.source];
        const sourceFile = `file://${this.props.source}`;
        const dimensionStyle = this.props.fullWidth
            ? {width: '100%', aspectRatio: this.state.imageAspectRatio || 1, height: undefined}
            : {height: 36, width: 36};
        return <View>
            <TouchableNativeFeedback onPress={() => this.showModal()}>
                <Image source={{uri: sourceFile}} style={dimensionStyle} resizeMode={this.props.fullWidth ? 'cover' : 'contain'}
                       onLoad={(event) => {
                           if (!this.props.fullWidth) return;
                           const {width, height} = event.nativeEvent.source;
                           if (width && height) {
                               this.setState({imageAspectRatio: width / height});
                           }
                       }}/>
            </TouchableNativeFeedback>
            {this.state.showModal && (
                <Modal onRequestClose={() => this.hideModal()}>
                    <View style={styles.previewContainer}>
                        <ImageViewer imageUrls={_.map(mediaPath, path => ({url: `file://${path}`}))}
                                     renderIndicator={() => null}/>
                        <TouchableOpacity onPress={() => this.hideModal()} style={styles.closeButton}>
                            <Text style={styles.closeButtonText}>{I18n.t('closeImagePreview')}</Text>
                        </TouchableOpacity>
                    </View>
                </Modal>
            )}
        </View>
    }
}

const styles = StyleSheet.create({
    previewContainer: {flex: 1, backgroundColor: 'black'},
    closeButton: {
        position: 'absolute',
        top: 40,
        right: 16,
        backgroundColor: '#ffffff',
        borderRadius: 100,
        paddingHorizontal: 20,
        paddingVertical: 12,
    },
    closeButtonText: {color: Colors.TextHint, fontSize: Styles.normalTextSize},
});
