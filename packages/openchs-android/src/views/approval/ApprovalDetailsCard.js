import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import PropTypes from 'prop-types';
import {StyleSheet, Text, TouchableNativeFeedback, View} from "react-native";
import Styles from "../primitives/Styles";
import moment from "moment";

class ApprovalDetailsCard extends AbstractComponent {
    static propTypes = {
        approvableEntity: PropTypes.object.isRequired,
        onApprovalSelection: PropTypes.func.isRequired
    };

    constructor(props, context) {
        super(props, context);
    }

    background() {
        return TouchableNativeFeedback.SelectableBackground();
    }

    renderRejectionComment(approvableEntity) {
        return (approvableEntity.isRejectedEntity() ?
            <View style={{height: 30, marginTop: 6}}>
                <Text numberOfLines={2}
                      style={styles.commentTextStyle}>{approvableEntity.latestEntityApprovalStatus.approvalStatusComment}</Text>
            </View> : null)
    }

    render() {
        const {approvableEntity, onApprovalSelection} = this.props;
        const hrs = moment().diff(approvableEntity.latestEntityApprovalStatus.statusDateTime, 'hours');
        const cardHeight = approvableEntity.isRejectedEntity() ? 100 : 50;
        return (
            <TouchableNativeFeedback onPress={() => onApprovalSelection(approvableEntity)}
                                     background={TouchableNativeFeedback.SelectableBackground()}>
                <View style={[styles.container, {backgroundColor: "lightgrey", minHeight: cardHeight}]}>
                    <View style={styles.leftContainer}>
                        <Text style={styles.requestTextStyle}>{this.I18n.t('requestName', {entityName: approvableEntity.getEntityTypeName()})}</Text>
                        {this.renderRejectionComment(approvableEntity)}
                        <Text style={styles.auditTextStyle}>{this.I18n.t('addXHoursAgo', {hrs})}</Text>
                    </View>
                    <View style={styles.rightContainer}>
                        <Text style={styles.entityTypeText}>{this.I18n.t(approvableEntity.getName())}</Text>
                    </View>
                </View>
            </TouchableNativeFeedback>
        );
    }
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        paddingHorizontal: Styles.ContainerHorizontalDistanceFromEdge,
        paddingVertical: Styles.ContainerHorizontalDistanceFromEdge,
    },
    leftContainer: {
        flexDirection: 'column',
        alignItems: 'flex-start',
        flex: 1
    },
    rightContainer: {
        flexDirection: 'column',
        alignItems: 'flex-end',
        flex: 1
    },
    entityTypeText: {
        fontSize: Styles.smallerTextSize,
        fontStyle: 'normal',
        color: 'white',
        backgroundColor: 'darkblue',
        padding: 5
    },
    requestTextStyle: {
        fontSize: Styles.smallerTextSize,
        marginTop: 2,
        fontStyle: 'normal',
        color: 'rgba(0, 0, 0, 0.66)',
        fontFamily: 'Inner',
    },
    auditTextStyle: {
        fontSize: Styles.smallerTextSize,
        marginTop: 6,
        fontStyle: 'normal',
        color: 'rgba(0, 0, 0, 0.54)',
        fontFamily: 'Inner',
    },
    commentTextStyle: {
        fontSize: Styles.smallerTextSize,
        fontStyle: 'normal',
        color: 'rgba(0, 0, 0, 0.87)',
        fontFamily: 'Inner',
    },
});

export default ApprovalDetailsCard;
