import AbstractComponent from "../../framework/view/AbstractComponent";
import React from "react";
import {View, Modal, TouchableOpacity, Text, TouchableWithoutFeedback} from 'react-native';
import Colors from "../primitives/Colors";
import {Button} from 'native-base'
import Icon from 'react-native-vector-icons/FontAwesome';
import Fonts from "../primitives/Fonts";

class StitchView extends AbstractComponent {

    static propTypes = {};

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
            right: 20,
            bottom: 70,
            borderRadius: 150,
            elevation: 2,
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
        this.modalButton = {
            alignSelf: 'flex-end',
            width: 40,
            height: 40,
            borderRadius: 80,
            backgroundColor: Colors.AccentColor,
            elevation: 2,
            marginBottom: 20,
        };
        this.modalIcon = {
            color: Colors.TextOnPrimaryColor,
            fontFamily: 'FontAwesome',
            fontWeight: 'bold',
            textAlign: 'center',
            alignSelf: 'center',
            fontSize: 30,
            padding: 5,
        };
        this.buttonStyle = {
            elevation: 2,
            flexWrap: 'nowrap',
            backgroundColor: '#e0e0e0',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 5,
        };
        this.buttonTextStyle = {
            fontSize: Fonts.Medium,
            color: Colors.DarkPrimaryColor
        }


    }

    renderContent() {
        return (
            this.props.programList.map(obj =>
                <View>
                    <TouchableOpacity style={{flexDirection: 'row-reverse', padding: 5}} onPress={() => obj.onPress()}>
                        {obj.icon}
                        <Button
                            style={this.buttonStyle}
                            textStyle={this.buttonTextStyle}>{obj.label}</Button>
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
                visible={this.state.modalVisible}
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
                    <Icon name="plus" size={30} style={this.floatingButtonIcon}/>
                </TouchableOpacity>
                {this.renderModal()}
            </View>
        );
    }

}

export default StitchView
