import React, {useContext} from 'react'
import {StyleSheet, Text, View} from "react-native";
import Colors from "../primitives/Colors";
import Styles from "../primitives/Styles";
import Observations from "../common/Observations";
import DecisionContentHelper from "./DecisionContentHelper";
import ServiceContext from "../../framework/context/ServiceContext";
import FormMappingService from "../../service/FormMappingService";
import {ApprovalButton} from "./ApprovalButton";

/**
 * What the approver recorded with their decision, shown to whoever opens the record
 * (avniproject/avni-client#2093).
 *
 * Rendered from eleven views - the approval dashboard, the end of a form flow, and every registration,
 * enrolment and encounter view - so changing it here is what makes the decision read the same way
 * everywhere it can be seen.
 *
 * Rejections show a reason either way: the answers when a Rejection form was used, the typed comment when
 * it was not. Approvals show only answers, because there has never been anything else to show on one.
 * Which of the two a rejection shows is decided by what that particular decision holds, never by whether a
 * form is attached now.
 *
 * Answers go through Observations rather than being formatted here, because that is what resolves concept
 * and answer names through ConceptService and handles media, phone-number and location answers - a field
 * worker must see question and answer text, not concept UUIDs. Passing the form as well is what groups
 * them under their page headings, the way every other set of observations in the app is laid out; without
 * it a two-page decision form renders as one undifferentiated list.
 *
 * The service comes from context rather than from AbstractComponent: this is a leaf rendered several times
 * per screen, and it has no use for the base class's focus registration, analytics or deferred loading.
 *
 * onEditPage and onEdit are supplied only where the approver works - the approval details screen. A field
 * worker opening their own rejected registration must not be able to rewrite the approver's answers, so
 * every other render site leaves them out and gets a read-only panel.
 */
export const DecisionMessage = ({entityApprovalStatus, I18n, onEditPage, onEdit}) => {

    const serviceContext = useContext(ServiceContext);

    if (!DecisionContentHelper.shouldRender(entityApprovalStatus)) return <View/>;

    const hasAnswers = DecisionContentHelper.hasAnswers(entityApprovalStatus);
    const form = hasAnswers
        ? serviceContext.getService(FormMappingService).findFormForDecision(entityApprovalStatus)
        : null;
    return (
        <View style={styles.container}>
            <Text style={styles.headerTextStyle}>{I18n.t(DecisionContentHelper.headerKey(entityApprovalStatus))}</Text>
            {hasAnswers ?
                <Observations observations={entityApprovalStatus.observations}
                              form={form}
                              style={styles.observationsStyle}
                              quickFormEdit={!!onEditPage}
                              onFormElementGroupEdit={onEditPage}/> :
                <Text style={styles.commentTextStyle}>{entityApprovalStatus.approvalStatusComment}</Text>}
            {hasAnswers && onEdit &&
            <View style={styles.editRow}>
                <ApprovalButton
                    name={I18n.t('editDecisionAnswers')}
                    textColor={Colors.TextOnPrimaryColor}
                    buttonColor={Colors.DarkPrimaryColor}
                    onPress={onEdit}
                    extraStyle={{paddingHorizontal: 20}}/>
            </View>}
        </View>
    )
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'column',
        // The answers table draws its own full-width rows and heading bands. Horizontal padding on this
        // panel inset those rows from the panel edge while the heading text sat flush, so the two read as
        // misaligned. The padding now belongs to the text; the table spans the panel.
        paddingVertical: 16,
        backgroundColor: Colors.RejectionMessageBackground
    },
    headerTextStyle: {
        fontSize: Styles.smallTextSize,
        fontWeight: 'bold',
        paddingHorizontal: 16,
        color: Colors.RejectionMessageColor,
    },
    commentTextStyle: {
        fontSize: Styles.smallerTextSize,
        marginTop: 2,
        paddingHorizontal: 16,
        fontStyle: 'normal',
        color: Colors.RejectionMessageColor,
    },
    observationsStyle: {
        marginTop: 6,
    },
    editRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        paddingHorizontal: 16,
        marginTop: 10,
    }
});
