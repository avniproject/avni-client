import React from 'react'
import {StyleSheet, Text, View} from "react-native";
import Colors from "../primitives/Colors";
import Styles from "../primitives/Styles";
import Observations from "../common/Observations";
import RejectionContentHelper from "./RejectionContentHelper";

/**
 * The approver's reason for rejecting, shown to the field worker (avniproject/avni-client#2093).
 *
 * Rendered from eleven views - the approval dashboard, the end of a form flow, and every registration,
 * enrolment and encounter view - so changing it here is what makes the reason appear the same way
 * everywhere it can currently be seen.
 *
 * Which of the two reasons is shown is decided by what this particular decision holds, never by whether a
 * form is attached now. Answers go through Observations rather than being formatted here, because that is
 * what resolves concept and answer names through ConceptService and handles media, phone-number and
 * location answers - a field worker must see question and answer text, not concept UUIDs.
 */
export const RejectionMessage = ({entityApprovalStatus, I18n}) => {

    if (!RejectionContentHelper.shouldRender(entityApprovalStatus)) return <View/>;

    return (
        <View style={styles.container}>
            <Text style={styles.headerTextStyle}>{I18n.t('rejectionNote')}</Text>
            {RejectionContentHelper.hasAnswers(entityApprovalStatus) ?
                <Observations observations={entityApprovalStatus.observations} style={styles.observationsStyle}/> :
                <Text style={styles.commentTextStyle}>{entityApprovalStatus.approvalStatusComment}</Text>}
        </View>
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
    },
    observationsStyle: {
        marginTop: 2,
    }
});
