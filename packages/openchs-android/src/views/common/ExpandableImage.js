import PropTypes from 'prop-types';
import React from 'react';
import {Image, Modal, TouchableNativeFeedback, View, Text} from "react-native";
import {ImageViewer} from "react-native-image-zoom-viewer";
import _ from 'lodash';
import {Button, Icon} from "native-base";
import Colors from "../primitives/Colors";

export default class ExpandableImage extends React.Component {
    static propTypes = {
        source: PropTypes.string,
        allMediaAbsolutePath: PropTypes.array
    };
    static defaultProps = {
        allMediaAbsolutePath: [],
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
        const mediaPath = !_.isEmpty(this.props.allMediaAbsolutePath) ? this.props.allMediaAbsolutePath : [this.props.source];
        const sourceFile = `file://${this.props.source}`;
        return <View>
            <TouchableNativeFeedback onPress={() => this.showModal()}>
                <Image source={{uri: sourceFile}} style={{height: 36, width: 36}}/>
            </TouchableNativeFeedback>
            {this.state.showModal && (
                <Modal onRequestClose={() => this.hideModal()}>
                    <View style={{backgroundColor: 'black'}}>
                        <Button transparent onPress={() => this.hideModal()}
                                style={{height: 20, alignSelf: 'flex-end', marginTop: 10}}>
                            <Icon style={{fontSize: 35, color: Colors.headerIconColor}} name='close'
                                  type='MaterialIcons'/>
                        </Button>
                    </View>
                    <ImageViewer imageUrls={_.map(mediaPath, path => ({url: `file://${path}`}))}
                    />
                </Modal>
            )}
        </View>
    }
}
