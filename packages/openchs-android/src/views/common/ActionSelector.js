import {
    Dimensions,
    Modal,
    Text,
    TouchableNativeFeedback,
    TouchableWithoutFeedback,
    View,
    ScrollView
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
    },
    spacer: {
        opacity: 0.5,
        width: width * 0.15
    },
    modal: {
        flexDirection: 'row'
    },
    closeIcon: {
        justifyContent: 'flex-end',
        flexDirection: 'row'
    },
    heading: {
        fontSize: 20,
        color: Styles.blackColor
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

    render() {
        return (
            <Modal
                animationType={"fade"}
                transparent={true}
                visible={this.props.visible}
                onRequestClose={() => this.props.hide()}
            >
                <View style={styles.modal}>
                    {this.spacer()}
                    {this.contentContainer()}
                    {this.spacer()}
                </View>
            </Modal>
        );
    }

    spacer() {
        return (
            <TouchableWithoutFeedback onPress={() => this.props.hide()}>
                <View style={styles.spacer}/>
            </TouchableWithoutFeedback>
        );
    }

    contentContainer() {
        return (
            <ScrollView style={{width: width + 0.7}} contentContainerStyle={[styles.modalBackground]}>
                {this.closeButton()}
                {this.heading()}
                {this.actionButtons()}
            </ScrollView>
        );
    }

    closeButton() {
        return (
            <TouchableWithoutFeedback onPress={() => this.props.hide()}>
                <View style={styles.closeIcon}>
                    <MCIIcon name={'close'} style={{fontSize: 24}}/>
                </View>
            </TouchableWithoutFeedback>
        );
    }

    heading() {
        return (
            <View style={{margin: 8}}>
                <Text style={styles.heading}>{this.props.title}</Text>
            </View>
        );
    }

    actionButtons() {
        return _.map(this.props.actions, (action, key) =>
            this.actionButton(
                action.fn,
                action.backgroundColor || Colors.ActionButtonColor,
                action.label,
                Colors.TextOnPrimaryColor,
                key
            )
        )
    }

    actionButton(onPress, buttonColor, text, textColor, index) {
        return (
            <View key={index} style={{paddingTop: 10}}>
                <TouchableNativeFeedback onPress={() => {
                    this.props.hide();
                    onPress();
                }}>
                    <View style={[Styles.basicPrimaryButtonView, {backgroundColor: buttonColor, minHeight: 50, maxWidth: width * 0.7}]}>
                        <Text style={{
                            fontSize: 18,
                            color: textColor,
                            textAlign: 'center',
                            paddingVertical: 8,
                        }}>{text}</Text>
                    </View>
                </TouchableNativeFeedback>
            </View>
        );
    }
}

export default ActionSelector;
