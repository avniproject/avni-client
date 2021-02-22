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

    render() {
        const entity = this.props.entity;
        const individual = entity.individual;
        const nameToDisplay = individual.nameString;
        const entityName = entity.getName();
        const subjectTypeName = individual.subjectTypeName;
        const hrs = moment().diff(entity.latestEntityApprovalStatus.statusDateTime, 'hours');
        return (
            <SafeAreaView>
                <View style={styles.container}>
                    <View style={styles.leftContainer}>
                        <Text style={Styles.textStyle}>{nameToDisplay}</Text>
                        <Text style={styles.requestTextStyle}>{this.I18n.t('requestName', {entityName})}</Text>
                        <Text style={styles.auditTextStyle}>{this.I18n.t('addXHoursAgo', {hrs})}</Text>
                    </View>
                    <View style={styles.rightContainer}>
                        {this.renderSubjectType(subjectTypeName)}
                    </View>
                </View>
            </SafeAreaView>
        );
    }
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        height: 80,
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
    requestTextStyle: {
        fontSize: Styles.smallerTextSize,
        marginTop: 2,
        fontStyle: 'normal',
        color: Styles.blackColor,
    }, auditTextStyle: {
        fontSize: Styles.smallerTextSize,
        marginTop: 6,
        fontStyle: 'normal',
        color: Colors.SecondaryText,
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
