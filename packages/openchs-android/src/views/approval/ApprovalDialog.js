import React from 'react';
import {Dimensions, Modal, StyleSheet, Text, TextInput, View} from "react-native";
import Styles from "../primitives/Styles";
import _ from "lodash";
import {ApprovalButton} from "./ApprovalButton";
import Colors from "../primitives/Colors";

export const ApprovalDialog = ({onClose, onInputChange, state, I18n, primaryButton, onPrimaryPress, secondaryButton, onSecondaryPress}) => {
    const {title, message, showInputBox, rejectionComment, openDialog} = state;
    const [error, setError] = React.useState("");
    const primaryButtonHandler = () => {
        if (showInputBox && _.isEmpty(rejectionComment)) {
            setError(I18n.t('commentCannotBeEmpty'));
        } else {
            onPrimaryPress();
        }
    };
    const {height} = Dimensions.get('window');
    const dialogHeight = showInputBox ? 280 : 220;

    return (
        <Modal
            animationType="none"
            transparent={true}
            visible={openDialog}
            onRequestClose={onClose}
        >
            <View style={[styles.centeredView, {height: height}]}>
                <View style={[styles.modalView, {height: dialogHeight}]}>
                    <Text style={styles.titleTextStyle}>{title}</Text>
                    <Text style={styles.messageStyle}>{message}</Text>
                    {showInputBox &&
                    <TextInput style={{borderWidth: 1, height: 80, borderColor: '#c8c8c8'}}
                               value={_.isNil(rejectionComment) ? "" : rejectionComment}
                               onChangeText={(text) => onInputChange(text)}
                               multiline={true}/>
                    }
                    <Text style={styles.errorTextStyle}>{error}</Text>
                    <View style={styles.buttonContainer}>
                        <ApprovalButton
                            name={secondaryButton}
                            textColor={Colors.DarkPrimaryColor}
                            buttonColor={Colors.cardBackgroundColor}
                            onPress={onSecondaryPress}
                            extraStyle={styles.approvalDialogButtonContainer}
                        />
                        <View style={{width: 20}}/>
                        <ApprovalButton
                            name={primaryButton}
                            textColor={Colors.TextOnPrimaryColor}
                            buttonColor={Colors.DarkPrimaryColor}
                            onPress={primaryButtonHandler}
                            extraStyle={styles.approvalDialogButtonContainer}
                        />
                    </View>
                </View>
            </View>
        </Modal>
    )
};

const styles = StyleSheet.create({
    centeredView: {
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        padding: 20,
    },
    modalView: {
        flexDirection: 'column',
        backgroundColor: "white",
        borderRadius: 5,
        padding: 15,
        shadowColor: "#000",
        elevation: 2
    },
    titleTextStyle: {
        marginTop: 5,
        fontSize: Styles.titleSize,
        fontStyle: 'normal',
        color: Styles.blackColor,
    },
    messageStyle: {
        marginTop: 15,
        fontSize: Styles.normalTextSize,
        fontStyle: 'normal',
        color: Styles.blackColor,
    },
    errorTextStyle: {
        fontSize: Styles.smallerTextSize,
        fontStyle: 'normal',
        color: Colors.ValidationError
    },
    buttonContainer: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'flex-end'
    },
    approvalDialogButtonContainer: {
        elevation: 2,
        height: 38,
        width: 90,
        borderRadius: 5,
    }
});
