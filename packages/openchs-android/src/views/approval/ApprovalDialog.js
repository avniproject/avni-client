import React from 'react';
import {Dimensions, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View} from "react-native";
import Styles from "../primitives/Styles";
import _ from "lodash";
import {ApprovalButton} from "./ApprovalButton";
import Colors from "../primitives/Colors";
import AvniIcon from "../common/AvniIcon";

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
    const dialogHeight = showInputBox ? height/1.5 : height/2;

    return (
        <Modal
            animationType="none"
            transparent={true}
            visible={openDialog}
            onRequestClose={onClose}
        >
            <View style={[styles.centeredView, {height: height}]}>
                <View style={[styles.modalView, {maxHeight: dialogHeight}]}>
                    <View style={styles.titleRow}>
                        <Text style={styles.titleTextStyle}>{title}</Text>
                        <TouchableOpacity onPress={onClose} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
                            <AvniIcon type="MaterialIcons" name="close" style={styles.closeIcon}/>
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.messageStyle}>{message}</Text>
                    {showInputBox &&
                    <TextInput style={styles.commentInput}
                               value={_.isNil(rejectionComment) ? "" : rejectionComment}
                               onChangeText={(text) => onInputChange(text)}
                               placeholderTextColor={Colors.TextHint}
                               multiline={true}/>
                    }
                    {!_.isEmpty(error) && <Text style={styles.errorTextStyle}>{error}</Text>}
                    <View style={styles.buttonContainer}>
                        <ApprovalButton
                            name={secondaryButton}
                            textColor={Colors.BrandPrimaryDark}
                            buttonColor={Colors.WhiteContentBackground}
                            onPress={onSecondaryPress}
                            extraStyle={[styles.approvalDialogButtonContainer, styles.secondaryButtonContainer]}
                        />
                        <View style={{width: 12}}/>
                        <ApprovalButton
                            name={primaryButton}
                            textColor={Colors.TextOnPrimaryColor}
                            buttonColor={Colors.BrandPrimaryDark}
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
        width: '100%',
        maxWidth: 360,
        backgroundColor: Colors.WhiteContentBackground,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: Colors.BrandPrimary,
        padding: 20,
        overflow: 'hidden',
    },
    titleRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
    titleTextStyle: {
        fontSize: Styles.titleSize + 2,
        fontWeight: '500',
        color: Colors.BrandPrimary,
    },
    closeIcon: {fontSize: 20, color: Colors.TextSecondary},
    messageStyle: {
        marginTop: 12,
        fontSize: Styles.normalTextSize,
        color: Colors.TextSecondary,
    },
    commentInput: {
        marginTop: 16,
        height: 80,
        borderWidth: 1,
        borderColor: Colors.TextHint,
        borderRadius: 4,
        padding: 10,
        textAlignVertical: 'top',
        color: Colors.TextPrimaryDark
    },
    errorTextStyle: {
        marginTop: 8,
        fontSize: Styles.smallerTextSize,
        color: Colors.ValidationError
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: 20
    },
    approvalDialogButtonContainer: {
        elevation: 0,
        height: 44,
        minWidth: 96,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center'
    },
    secondaryButtonContainer: {
        borderWidth: 1,
        borderColor: Colors.BrandPrimary
    }
});
