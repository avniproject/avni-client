import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import PropTypes from 'prop-types';
import {SafeAreaView, StyleSheet, Text, TouchableNativeFeedback, View} from "react-native";
import Styles from "../primitives/Styles";
import Colors from "../primitives/Colors";
import moment from "moment";

class ApprovalDetailsCard extends AbstractComponent {

    static propTypes = {
        entity: PropTypes.object.isRequired,
    };

    constructor(props, context) {
        super(props, context);
    }

    renderSubjectType(subjectTypeName) {
        return (
            <View style={styles.subjectTypeContainer}>
                <Text style={styles.subjectTypeText}>{this.I18n.t(subjectTypeName)}</Text>
            </View>
        );
    }

    background() {
        return TouchableNativeFeedback.SelectableBackground();
    }

    renderRejectionComment(entity) {
        return (entity.isRejectedEntity() ?
            <View style={{height: 30, marginTop: 6}}>
                <Text numberOfLines={2}
                      style={styles.commentTextStyle}>{entity.latestEntityApprovalStatus.approvalStatusComment}</Text>
            </View> : null)
    }

    render() {
        const entity = this.props.entity;
        const individual = entity.individual;
        const nameToDisplay = individual.nameString;
        const entityName = entity.getName();
        const subjectTypeName = individual.subjectTypeName;
        const hrs = moment().diff(entity.latestEntityApprovalStatus.statusDateTime, 'hours');
        const cardHeight = entity.isRejectedEntity() ? 125 : 90;
        return (
            <SafeAreaView>
                <View style={[styles.container, {minHeight: cardHeight}]}>
                    <View style={{flexDirection: 'row'}}>
                        <View style={styles.leftContainer}>
                            <Text style={Styles.textStyle}>{nameToDisplay}</Text>
                            <Text style={styles.requestTextStyle}>{this.I18n.t('requestName', {entityName})}</Text>
                        </View>
                        <View style={styles.rightContainer}>
                            {this.renderSubjectType(subjectTypeName)}
                        </View>
                    </View>
                    <View style={styles.leftContainer}>
                        {this.renderRejectionComment(entity)}
                        <Text style={styles.auditTextStyle}>{this.I18n.t('addXHoursAgo', {hrs})}</Text>
                    </View>
                </View>
            </SafeAreaView>
        );
    }
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'column',
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
    headerTextStyle: {
        fontSize: Styles.normalTextSize,
        fontStyle: 'normal',
        color: 'rgba(0, 0, 0, 0.87)',
        lineHeight: 24,
        fontFamily: 'Inner',
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
    subjectTypeContainer: {
        height: 22,
        marginRight: 5,
        borderRadius: 3,
        paddingHorizontal: 5,
        backgroundColor: Colors.SubjectTypeColor,
        paddingTop: 2
    },
    subjectTypeText: {
        fontSize: Styles.smallerTextSize,
        fontStyle: 'normal',
        color: Styles.whiteColor,
    }
});


export default ApprovalDetailsCard;
