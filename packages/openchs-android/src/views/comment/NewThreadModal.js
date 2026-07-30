import AbstractComponent from "../../framework/view/AbstractComponent";
import React from 'react';
import Reducers from "../../reducer";
import {Modal, StyleSheet, Text, TextInput, TouchableOpacity, View} from 'react-native';
import {CommentActionNames as Actions} from "../../action/comment/CommentActions";
import Colors from "../primitives/Colors";
import AvniIcon from "../common/AvniIcon";

class NewThreadModal extends AbstractComponent {

    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.comment);
    }

    render() {
        return <Modal transparent
                      visible={this.props.open}
                      animationType="fade"
                      onShow={() => {this.textInput.focus();}}
                      onDismiss={this.props.onClose}>
            <View style={styles.modalContainer}>
                <View style={styles.container}>
                    <View style={styles.titleRow}>
                        <Text style={styles.title}>{this.I18n.t('startNewThread')}</Text>
                        <TouchableOpacity onPress={this.props.onClose} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
                            <AvniIcon type="MaterialIcons" name="close" style={styles.closeIcon}/>
                        </TouchableOpacity>
                    </View>
                    <TextInput ref={(input) => {this.textInput = input;}}
                               style={styles.textInputStyle}
                               value={this.state.comment.text}
                               placeholder={this.I18n.t('startNewThread')}
                               placeholderTextColor={Colors.TextHint}
                               underlineColorAndroid='transparent'
                               onChangeText={(value) => this.dispatchAction(Actions.ON_CHANGE_TEXT, {value})}
                               multiline={true}/>
                    <View style={styles.buttonContainer}>
                        <TouchableOpacity onPress={this.props.onClose} style={[styles.buttonStyle, styles.secondaryButton]}>
                            <Text style={styles.secondaryButtonText}>{this.I18n.t('closeModal')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => this.dispatchAction(Actions.ON_SEND)} style={[styles.buttonStyle, styles.primaryButton]}>
                            <Text style={styles.primaryButtonText}>{this.I18n.t('createThread')}</Text>
                        </TouchableOpacity>
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
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        padding: 24
    },
    container: {
        width: '100%',
        maxWidth: 340,
        backgroundColor: Colors.WhiteContentBackground,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: Colors.BrandPrimary,
        padding: 20,
        overflow: 'hidden'
    },
    titleRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
    title: {
        fontSize: 18,
        fontWeight: '500',
        color: Colors.BrandPrimary
    },
    closeIcon: {fontSize: 20, color: Colors.TextSecondary},
    textInputStyle: {
        marginTop: 16,
        borderRadius: 4,
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderColor: Colors.TextHint,
        borderWidth: 1,
        height: 80,
        textAlignVertical: 'top',
        color: Colors.TextPrimaryDark
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 16
    },
    buttonStyle: {
        flex: 1,
        height: 48,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center'
    },
    secondaryButton: {
        backgroundColor: Colors.WhiteContentBackground,
        borderWidth: 1,
        borderColor: Colors.BrandPrimary,
        marginRight: 8
    },
    secondaryButtonText: {
        color: Colors.BrandPrimaryDark,
        fontWeight: '600'
    },
    primaryButton: {
        backgroundColor: Colors.BrandPrimaryDark,
        marginLeft: 8
    },
    primaryButtonText: {
        color: Colors.TextOnPrimaryColor,
        fontWeight: '600'
    }
});

export default NewThreadModal;
