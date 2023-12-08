import AbstractComponent from "../../framework/view/AbstractComponent";
import {StyleSheet, Text, TouchableNativeFeedback, View} from "react-native";
import Styles from "../primitives/Styles";
import ApprovalDetailsCard from "./ApprovalDetailsCard";
import React from "react";
import Colors from "../primitives/Colors";
import PropTypes from "prop-types";

class SubjectApprovalView extends AbstractComponent {
    static propTypes = {
        subject: PropTypes.object.isRequired,
        approvalStatus_status: PropTypes.string.isRequired,
        onApprovalSelection: PropTypes.func.isRequired
    };

    render() {
        const {subject, approvalStatus_status} = this.props;
        const nameToDisplay = subject.nameString;

        return <TouchableNativeFeedback key={subject.uuid}
                                 background={TouchableNativeFeedback.SelectableBackground()}>
            <View style={styles.cardContainer}>
                <View style={{flexDirection: 'row'}}>
                    <View style={styles.leftContainer}>
                        <Text style={Styles.textStyle}>{nameToDisplay}</Text>
                    </View>
                </View>
                {subject.getMemberEntitiesWithLatestStatus(approvalStatus_status).map((x) =>
                    <ApprovalDetailsCard key={x.uuid} approvableEntity={x} onApprovalSelection={() => this.props.onApprovalSelection(x)}/>)}
            </View>
        </TouchableNativeFeedback>;
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
    auditTextStyle: {
        fontSize: Styles.smallerTextSize,
        marginTop: 6,
        fontStyle: 'normal',
        color: 'rgba(0, 0, 0, 0.54)',
        fontFamily: 'Inner',
    }
});

export default SubjectApprovalView;
