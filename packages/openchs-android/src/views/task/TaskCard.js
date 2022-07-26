import React, {Fragment} from 'react';
import AbstractComponent from "../../framework/view/AbstractComponent";
import Reducers from "../../reducer";
import {TaskActionNames as Actions} from "../../action/task/TaskActions";
import RNImmediatePhoneCall from "react-native-immediate-phone-call";
import _ from "lodash";
import {DatePickerAndroid, StyleSheet, Text, TouchableNativeFeedback, View} from "react-native";
import Styles from "../primitives/Styles";
import {Icon} from "native-base";
import Colors from "../primitives/Colors";
import PropTypes from "prop-types";
import TaskStatusPicker from "./TaskStatusPicker";
import TypedTransition from "../../framework/routing/TypedTransition";
import CHSNavigator from "../../utility/CHSNavigator";
import IndividualSearchResultPaginatedView from "../individual/IndividualSearchSeasultPaginatedView";
import IndividualService from "../../service/IndividualService";

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

    renderPhoneNumber(task) {
        const phoneNumberObs = _.find(task.metadata, ({concept}) => concept.isMobileNo());
        return _.isNil(phoneNumberObs) ? null : (
            <Fragment>
                <Text style={Styles.textStyle}>{phoneNumberObs.getReadableValue()}</Text>
                <Icon name='call' style={styles.iconStyle}
                      onPress={() => this.onCallPress(phoneNumberObs.getReadableValue())}/>
            </Fragment>
        )
    }

    renderSubjectDetails(task) {
        return task.isOpenSubjectType() && !_.isNil(task.subject) ? (
            <TouchableNativeFeedback
                onPress={() => this.goToSubjectDashboard(this, task.subject)}
                background={TouchableNativeFeedback.SelectableBackground()}
            >
                <View style={{backgroundColor: '#E7E7E7', padding: 16}}>
                    <View style={[styles.cardContainer, {elevation: 2}]}>
                        <Text style={Styles.textStyle}>{task.subject.nameString}</Text>
                        <Text style={Styles.textStyle}>{this.I18n.t(task.subject.lowestAddressLevel.name)}</Text>
                        <Icon name={'chevron-right'} type={'MaterialIcons'} style={styles.iconStyle}/>
                    </View>
                </View>
            </TouchableNativeFeedback>
        ) : null
    }


    render() {
        const task = this.props.task;
        return (
            <View style={styles.container} key={task.uuid}>
                <View style={styles.cardContainer}>
                    <Text style={Styles.textStyle}>{task.name}</Text>
                    {task.isCallType() ? this.renderPhoneNumber(task) : null}
                    <Icon style={styles.iconStyle} name='repeat' type='FontAwesome'
                          onPress={() => this.onChangeStatusPress(task)}/>
                    <Icon style={styles.iconStyle} name='back-in-time' type='Entypo'
                          onPress={() => this.onReschedulePress(task)}/>
                </View>
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
        elevation: 2,
    },
    cardContainer: {
        paddingHorizontal: Styles.ContainerHorizontalDistanceFromEdge,
        paddingVertical: 6,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#D9D9D9',
    },
    iconStyle: {
        color: Colors.AccentColor,
        opacity: 0.8,
        alignSelf: 'center',
        fontSize: 30
    }
});

export default TaskCard;
