import AbstractComponent from "../../framework/view/AbstractComponent";
import React from "react";
import {View, Modal, TouchableOpacity, Text, TouchableWithoutFeedback} from 'react-native';
import Colors from "../primitives/Colors";
import {Button} from 'native-base'
import {Icon} from 'native-base';
import Fonts from "../primitives/Fonts";

class FloatingActionButton extends AbstractComponent {

    static propTypes = {
        actions: React.PropTypes.array.isRequired
    };

    constructor(props, context) {
        super(props, context);
        this.state = {modalVisible: false};
        this.createStyles();
    }

    setModalVisible(visible) {
        this.setState({
            modalVisible: visible,
        })
    }

    onPress() {
        this.setModalVisible(true)
    }


    createStyles() {
        this.floatingButton = {
            position: 'absolute',
            width: 60,
            height: 60,
            alignItems: 'center',
            justifyContent: 'center',
            right: 30,
            bottom: 30,
            borderRadius: 150,
            backgroundColor: Colors.AccentColor
        };
        this.floatingButtonIcon = {
            color: Colors.TextOnPrimaryColor,
        };
        this.modalOverlay = {
            flexDirection: 'column',
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.9)'
        };
        this.modalContent = {
            flex: 1,
            flexDirection: 'column-reverse',
            padding: 20,
        };
        this.buttonStyle = {
            backgroundColor: '#e0e0e0',
            alignItems: 'center',
            justifyContent: 'center',
        };
        this.buttonTextStyle = {
            fontSize: Fonts.Medium,
            color: Colors.DarkPrimaryColor
        }


    }

    reset(fun) {
        this.setModalVisible(false);
        fun()
    }

    renderContent() {
        return (
            this.props.actions.map((action, key) =>
                <View key={key} style={{flexDirection: 'row-reverse'}}>
                    {action.icon}
                    <TouchableOpacity hitSlop={{top: 0, bottom: 0, left: 0, right: 50}}
                                      onPress={() => this.reset(action.fn)}>
                        <Button disabled={true}
                                style={this.buttonStyle}
                                textStyle={this.buttonTextStyle}>{action.label}
                        </Button>
                    </TouchableOpacity>
                </View>
            )
        );
    }

    renderModal() {
        if (!this.state.modalVisible) {
            return null;
        }
        return (
            <Modal
                animationType='fade'
                transparent={true}
                // visible={this.state.modalVisible}
                presentationStyle='fullScreen'
                onRequestClose={() => {
                    this.setModalVisible(false)
                }}>
                <TouchableWithoutFeedback onPress={() => {
                    this.setModalVisible(!this.state.modalVisible);
                }}>
                    <View style={this.modalOverlay}>
                        <View style={this.modalContent}>
                            {this.renderContent()}
                        </View>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>

        );
    }

    render() {
        return (
            <View>
                <TouchableOpacity activeOpacity={0.5}
                                  onPress={() => this.onPress()}
                                  style={this.floatingButton}>
                    <Icon name="add" size={40} style={this.floatingButtonIcon}/>
                </TouchableOpacity>
                {this.renderModal()}
            </View>
        );
    }

}

export default FloatingActionButton
