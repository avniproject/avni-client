import AbstractComponent from "../../framework/view/AbstractComponent";
import {StyleSheet, Text, TouchableNativeFeedback, View} from "react-native";
import Styles from "../primitives/Styles";
import ApprovalDetailsCard from "./ApprovalDetailsCard";
import React from "react";
import Colors from "../primitives/Colors";
import PropTypes from "prop-types";
import Separator from "../primitives/Separator";
import _ from "lodash";
import {ApprovalStatus} from "openchs-models";

const noRecordMessageKeys = {
    [ApprovalStatus.statuses.Pending]: 'noRecordPendingApproval',
    [ApprovalStatus.statuses.Approved]: 'noRecordApproved',
    [ApprovalStatus.statuses.Rejected]: 'noRecordRejected',
};

export function noRecordMessageKey(approvalStatus_status) {
    return noRecordMessageKeys[approvalStatus_status] || 'noRecordPendingApproval';
}

class SubjectApprovalView extends AbstractComponent {
    static propTypes = {
        subject: PropTypes.object.isRequired,
        approvalStatus_status: PropTypes.string.isRequired,
        onApprovalSelection: PropTypes.func.isRequired
    };

    render() {
        const {subject, approvalStatus_status} = this.props;
        const nameToDisplay = subject.nameString;
        const entities = subject.getMemberEntitiesWithLatestStatus(approvalStatus_status);

        return <View style={styles.cardContainer} key={subject.uuid}>
            <View style={{flexDirection: 'row'}}>
                <View style={styles.leftContainer}>
                    <Text style={Styles.textStyle}>{nameToDisplay}</Text>
                </View>
            </View>
            {_.isEmpty(entities) &&
                <Text style={styles.noRecordTextStyle}>{this.I18n.t(noRecordMessageKey(approvalStatus_status))}</Text>}
            {entities.map((x) => {
                return <>
                    <ApprovalDetailsCard key={x.uuid} approvableEntity={x} onApprovalSelection={() => this.props.onApprovalSelection(x)}/>
                    <Separator backgroundColor={Colors.InputBorderNormal}/>
                </>
            })}
        </View>;
    }
}

const styles = StyleSheet.create({
    cardContainer: {
        marginHorizontal: 16,
        elevation: 2,
        backgroundColor: Colors.cardBackgroundColor,
        marginVertical: 5,
        borderRadius: 5,
    },
    leftContainer: {
        flexDirection: 'column',
        alignItems: 'flex-start',
        marginLeft: 10,
        marginTop: 10,
        flex: 1
    },
    noRecordTextStyle: {
        fontSize: Styles.smallerTextSize,
        fontStyle: 'italic',
        color: Colors.DetailsTextColor,
        marginLeft: 10,
        marginTop: 6,
        marginBottom: 10,
    },
    auditTextStyle: {
        fontSize: Styles.smallerTextSize,
        marginTop: 6,
        fontStyle: 'normal',
        color: 'rgba(0, 0, 0, 0.54)',
        fontFamily: 'Inner',
    }
});

export default SubjectApprovalView;
