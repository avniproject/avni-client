import {
    Dimensions,
    Modal,
    Text,
    TouchableNativeFeedback,
    TouchableWithoutFeedback,
    View
} from "react-native";
import PropTypes from 'prop-types';
import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import MCIIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import Styles from "../primitives/Styles";
import _ from "lodash";
import Colors from "../primitives/Colors";

const {width} = Dimensions.get('window');

const styles = {
    modalBackground: {
        width: width * .7,
        backgroundColor: 'white',
        flexWrap: 'nowrap',
        justifyContent: 'flex-start',
        padding: 20,
        alignSelf: 'center',
        borderRadius: 8
    }
};

class ActionSelector extends AbstractComponent {

    static propTypes = {
        actions: PropTypes.array.isRequired,
        visible: PropTypes.bool.isRequired,
        hide: PropTypes.func.isRequired,
        title: PropTypes.string.isRequired
    };


    constructor(props, context) {
        super(props, context);
    }

    renderButton(onPress, buttonColor, text, textColor, index) {
        return (
            <View key={index} style={{paddingTop:10}}>
                <TouchableNativeFeedback onPress={() => {
                    this.props.hide();
                    onPress();
                }}>
                    <View style={[Styles.basicPrimaryButtonView, {backgroundColor:buttonColor, height: 50}]}>
                        <Text style={{
                            fontSize: 18,
                            color: textColor
                        }}>{text}</Text>
                    </View>
                </TouchableNativeFeedback>
            </View>
        );
    }

    render() {

        return (
            <Modal
                animationType={"fade"}
                transparent={true}
                visible={this.props.visible}
                onRequestClose={() => this.props.hide()}
            >
                <TouchableWithoutFeedback onPress={() => this.props.hide()}>
                    <View style={{
                        flex: 1,
                        flexWrap: 'nowrap',
                        backgroundColor: 'rgba(60,60,60,0.9)',
                        flexDirection: 'column',
                    }}>
                        <View style={{flex: .4}}/>
                        <View style={[styles.modalBackground]}>
                            <View style={{justifyContent: 'flex-end', flexDirection: 'row'}}>
                                <MCIIcon name={'close'} style={{fontSize: 24}}/>
                            </View>
                            <View style={{margin:8}}>
                                <Text style={{fontSize: 20, color: Styles.blackColor}}>{this.props.title}</Text>
                            </View>
                            {_.map(this.props.actions, (action, key) =>
                                this.renderButton(
                                    action.fn,
                                    action.backgroundColor || Colors.ActionButtonColor,
                                    action.label,
                                    Colors.TextOnPrimaryColor,
                                    key
                                )
                            )}
                        </View>
                        <View style={{flex: 1}}/>
                    </View>
                </TouchableWithoutFeedback>

            </Modal>
        );
    }
}

export default ActionSelector;