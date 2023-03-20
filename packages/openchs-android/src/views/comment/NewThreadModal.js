import AbstractComponent from "../../framework/view/AbstractComponent";
import React from 'react';
import Reducers from "../../reducer";
import {Dimensions, Modal, StyleSheet, TextInput, View} from 'react-native';
import {CommentActionNames as Actions} from "../../action/comment/CommentActions";
import {Button, Text} from 'native-base'
import Colors from "../primitives/Colors";

const {width} = Dimensions.get("window");

class NewThreadModal extends AbstractComponent {

    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.comment);
    }

    render() {
        return <Modal transparent
                      visible={this.props.open}
                      presentationStyle="overFullScreen"
                      onShow={() => {this.textInput.focus();}}
                      onDismiss={this.props.onClose}>
            <View style={styles.modalContainer}>
                <View style={styles.container}>
                    <TextInput ref={(input) => {this.textInput = input;}}
                               style={styles.textInputStyle}
                               value={this.state.comment.text}
                               placeholder={this.I18n.t('startNewThread')}
                               underlineColorAndroid='transparent'
                               onChangeText={(value) => this.dispatchAction(Actions.ON_CHANGE_TEXT, {value})}
                               multiline={true}/>
                    <View style={styles.buttonContainer}>
                        <Button onPress={this.props.onClose} style={styles.buttonStyle}>
                            {this.I18n.t('closeModal')}
                        </Button>
                        <Button onPress={() => this.dispatchAction(Actions.ON_SEND)} style={styles.buttonStyle}>
                            {this.I18n.t('createThread')}
                        </Button>
                    </View>
                </View>
            </View>
        </Modal>
    }
}

const styles = StyleSheet.create({
    modalContainer: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: Colors.ModalBackgroundColor,
    },
    container: {
        position: "absolute",
        top: "50%",
        left: "50%",
        elevation: 5,
        transform: [{translateX: -(width * 0.4)},
            {translateY: -90}],
        height: 170,
        width: width * 0.8,
        backgroundColor: Colors.cardBackgroundColor,
        borderRadius: 7,
    },
    textInputStyle: {
        marginHorizontal: 15,
        marginVertical: 15,
        width: "90%",
        borderRadius: 5,
        paddingVertical: 8,
        paddingHorizontal: 8,
        borderColor: Colors.Separator,
        borderWidth: 1,
        marginBottom: 8,
        height: 80
    },
    buttonContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        marginVertical: 10,
        marginHorizontal: 10,
    },
    buttonStyle: {
        marginHorizontal: 5,
        height: 45,
        borderRadius: 5,
        alignSelf: 'center',
        backgroundColor: Colors.ActionButtonColor
    }
});

export default NewThreadModal;
