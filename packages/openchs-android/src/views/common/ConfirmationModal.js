import {Dimensions, Modal, Text, TouchableNativeFeedback, TouchableWithoutFeedback, View} from "react-native";
import PropTypes from 'prop-types';
import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Styles from "../primitives/Styles";
import _ from "lodash";
import Colors from "../primitives/Colors";

const {width} = Dimensions.get('window');

const styles = {
    modalBackground: {
        width: width * .8,
        backgroundColor: 'white',
        flexWrap: 'nowrap',
        justifyContent: 'flex-start',
        padding: 20,
        alignSelf: 'center',
        borderRadius: 8
    }
};

class ConfirmationModal extends AbstractComponent {

    static propTypes = {
        visible: PropTypes.bool.isRequired,
        hide: PropTypes.func.isRequired,
        title: PropTypes.string.isRequired,
        desc: PropTypes.string.isRequired,
        neutral: PropTypes.object,
        negative: PropTypes.object,
        positive: PropTypes.object,
    };

    constructor(props, context) {
        super(props, context);
    }

    renderButton(onPress, buttonColor, text, textColor) {
        return (
            <View style={{paddingTop: 10, paddingRight: 10}}>
                <TouchableNativeFeedback onPress={() => {
                    this.props.hide(onPress);
                }}>
                    <View style={[Styles.basicPrimaryButtonView, {
                        backgroundColor: buttonColor,
                        height: 50,
                        marginLeft: 8,
                        paddingHorizontal: 8
                    }]}>
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
        if(!this.props.visible) return <View/>;
        return (
            <Modal
                animationType={"fade"}
                transparent={true}
                visible={this.props.visible}
                onRequestClose={() => this.props.hide(_.noop)}
            >
                <TouchableWithoutFeedback onPress={() => this.props.hide(_.noop)}>
                    <View style={{
                        flex: 1,
                        flexWrap: 'nowrap',
                        backgroundColor: 'rgba(60,60,60,0.9)',
                        flexDirection: 'column',
                    }}>
                        <View style={{flex: .4}}/>
                        <View style={[styles.modalBackground]}>
                            <View style={{margin: 8}}>
                                <Text style={{fontSize: 22, color: Styles.blackColor}}>{this.props.title}</Text>
                            </View>
                            <View style={{margin: 8}}>
                                <Text style={{fontSize: 20, color: Styles.blackColor}}>{this.props.desc}</Text>
                            </View>
                            <View style={{
                                flexDirection: 'row',
                                flexWrap: 'nowrap',
                                justifyContent: 'flex-end',
                            }}>
                                {this.props.positive && this.renderButton(
                                    this.props.positive.action,
                                    Colors.ActionButtonColor,
                                    this.props.positive.label,
                                    Colors.TextOnPrimaryColor,
                                )}

                                {this.props.neutral && this.renderButton(
                                    this.props.neutral.action,
                                    Colors.SecondaryActionButtonColor,
                                    this.props.neutral.label,
                                    Colors.TextOnPrimaryColor,
                                )}

                                {this.props.negative && this.renderButton(
                                    this.props.negative.action,
                                    Colors.NegativeActionButtonColor,
                                    this.props.negative.label,
                                    Colors.TextOnPrimaryColor,
                                )}

                            </View>
                        </View>
                        <View style={{flex: 1}}/>
                    </View>
                </TouchableWithoutFeedback>

            </Modal>
        );
    }
}

export default ConfirmationModal;