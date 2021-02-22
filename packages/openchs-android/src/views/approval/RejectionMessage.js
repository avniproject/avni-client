import React from 'react'
import {StyleSheet, Text, View} from "react-native";
import Colors from "../primitives/Colors";
import Styles from "../primitives/Styles";

export const RejectionMessage = ({entityApprovalStatus, I18n}) => {

    const renderMessage = entityApprovalStatus && entityApprovalStatus.approvalStatus.isRejected;

    return (
        renderMessage ?
            <View style={styles.container}>
                <Text style={styles.headerTextStyle}>{I18n.t('rejectionNote')}</Text>
                <Text style={styles.commentTextStyle}>{entityApprovalStatus.approvalStatusComment}</Text>
            </View> :
            <View/>
    )
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'column',
        paddingHorizontal: 16,
        paddingVertical: 16,
        backgroundColor: Colors.RejectionMessageBackground
    },
    headerTextStyle: {
        fontSize: Styles.smallTextSize,
        fontWeight: 'bold',
        color: Colors.RejectionMessageColor,
    },
    commentTextStyle: {
        fontSize: Styles.smallerTextSize,
        marginTop: 2,
        fontStyle: 'normal',
        color: Colors.RejectionMessageColor,
    }
});
