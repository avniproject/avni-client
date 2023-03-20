import PropTypes from 'prop-types';
import React from 'react';
import {Image, Modal, TouchableNativeFeedback, View, Text} from "react-native";
import {ImageViewer} from "react-native-image-zoom-viewer";
import _ from 'lodash';
import {Button, Icon} from "native-base";
import Colors from "../primitives/Colors";
import AvniIcon from "./AvniIcon";

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
                    <View style={{backgroundColor: "black", padding: 5}}>
                        <Button onPress={() => this.hideModal()}
                                style={{height: 35, alignSelf: 'flex-end',backgroundColor: Colors.ActionButtonColor}}
                                leftIcon={<AvniIcon type="MaterialIcons" name="close" style={{color: Colors.headerIconColor, fontSize: 15}}/>}>
                        </Button>
                    </View>
                    <ImageViewer imageUrls={_.map(mediaPath, path => ({url: `file://${path}`}))}/>
                </Modal>
            )}
        </View>
    }
}
