import React, {Fragment} from 'react';
import AbstractComponent from "../../framework/view/AbstractComponent";
import Reducers from "../../reducer";
import {TaskActionNames as Actions} from "../../action/task/TaskActions";
import RNImmediatePhoneCall from "react-native-immediate-phone-call";
import _ from "lodash";
import {DatePickerAndroid, StyleSheet, Text, TouchableNativeFeedback, View} from "react-native";
import Styles from "../primitives/Styles";
import {Icon} from "native-base";
import PropTypes from "prop-types";
import TaskStatusPicker from "./TaskStatusPicker";
import TypedTransition from "../../framework/routing/TypedTransition";
import CHSNavigator from "../../utility/CHSNavigator";
import IndividualSearchResultPaginatedView from "../individual/IndividualSearchSeasultPaginatedView";
import IndividualService from "../../service/IndividualService";
import {IconContainer} from "./IconContainer";

class TaskCard extends AbstractComponent {
    static propTypes = {
        task: PropTypes.object.isRequired,
    };

    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.task);
    }

    onCallPress(mobileNumber) {
        RNImmediatePhoneCall.immediatePhoneCall(_.toString(mobileNumber));

        TypedTransition.from(this).with({
            headerTitle: this.I18n.t('subjectsWithMobileNumber', {number: _.toString(mobileNumber)}),
            results: this.getService(IndividualService).findAllWithMobileNumber(mobileNumber),
            onIndividualSelection: (source, subject) => this.goToSubjectDashboard(source, subject),
        }).to(IndividualSearchResultPaginatedView, true);
    }

    goToSubjectDashboard(source, subject) {
        return CHSNavigator.navigateToProgramEnrolmentDashboardView(source, subject.uuid)
    }

    async onReschedulePress(task) {
        const {action, year, month, day} = await DatePickerAndroid.open({date: task.scheduledOn, mode: 'calendar'});
        if (action !== DatePickerAndroid.dismissedAction) {
            const date = new Date(year, month, day);
            this.dispatchAction(Actions.ON_RE_SCHEDULED, {task, date});
        }
    }

    onChangeStatusPress(task) {
        this.dispatchAction(Actions.ON_STATUS_TOGGLE, {display: true, task});
    }

    renderSubjectDetails(task) {
        return task.isOpenSubjectType() && !_.isNil(task.subject) ? (
            <TouchableNativeFeedback
                onPress={() => this.goToSubjectDashboard(this, task.subject)}
                background={TouchableNativeFeedback.SelectableBackground()}
            >
                <View style={{backgroundColor: '#E7E7E7', padding: 16}}>
                    <View style={[styles.cardContainer]}>
                        <Text style={styles.textStyle}>{task.subject.nameString}</Text>
                        <Text style={styles.textStyle}>{this.I18n.t(task.subject.lowestAddressLevel.name)}</Text>
                        <Icon name={'chevron-right'} type={'MaterialIcons'} style={styles.iconStyle}/>
                    </View>
                </View>
            </TouchableNativeFeedback>
        ) : null
    }

    renderCallType(task) {
        const phoneNumberObs = _.find(task.metadata, ({concept}) => concept.isMobileNo());
        const phoneNumber = _.isNil(phoneNumberObs) ? '' : phoneNumberObs.getReadableValue();
        return (
            <View style={styles.cardContainer}>
                <View style={{width: 91}}>
                    <Text style={styles.textStyle}>{phoneNumber}</Text>
                </View>
                <View style={styles.iconContainer}>
                    <IconContainer
                        name='call'
                        type={'MaterialIcons'}
                        onPress={() => _.isNil(phoneNumberObs) ? _.noop() :
                            this.onCallPress(phoneNumberObs.getReadableValue())}
                    />
                    <Icon
                        style={styles.iconStyle}
                        name='clipboard-list'
                        type='FontAwesome5'
                        onPress={() => this.onChangeStatusPress(task)}/>
                    <IconContainer
                        onPress={() => this.onReschedulePress(task)}
                        name='back-in-time'
                        type='Entypo'
                    />
                </View>
            </View>
        )
    }

    renderOpenSubjectType(task) {
        return (
            <View style={styles.cardContainer}>
                <View style={{width: 200}}>
                    <Text style={styles.textStyle}>{task.name}</Text>
                </View>
                <View style={styles.iconContainer}>
                    <Icon
                        style={styles.iconStyle}
                        name='clipboard-list'
                        type='FontAwesome5'
                        onPress={() => this.onChangeStatusPress(task)}
                    />
                    <IconContainer
                        name='back-in-time'
                        type='Entypo'
                        onPress={() => this.onReschedulePress(task)}
                    />
                </View>
            </View>
        )
    }

    render() {
        const task = this.props.task;
        return (
            <View style={styles.container} key={task.uuid}>
                {task.isCallType() ? this.renderCallType(task) : this.renderOpenSubjectType(task)}
                {this.renderSubjectDetails(task)}
                {this.state.displayTaskStatusSelector && <TaskStatusPicker task={task}/>}
            </View>
        )
    }
}


const styles = StyleSheet.create({
    container: {
        flexDirection: 'column',
        marginVertical: 5,
        marginHorizontal: 16,
    },
    cardContainer: {
        borderRadius: 4,
        padding: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#DBDBDB',
    },
    iconContainer: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'space-around'
    },
    textStyle: {
        fontSize: Styles.smallTextSize,
        fontStyle: 'normal',
        fontFamily: 'Inter',
        color: '#070707',
        lineHeight: 16
    },
    iconStyle: {
        color: '#29869A',
        alignSelf: 'center',
        fontSize: 24
    }
});

export default TaskCard;
