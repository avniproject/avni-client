import React, {Fragment} from 'react';
import AbstractComponent from "../../framework/view/AbstractComponent";
import Reducers from "../../reducer";
import {TaskActionNames as Actions} from "../../action/task/TaskActions";
import RNImmediatePhoneCall from "react-native-immediate-phone-call";
import _ from "lodash";
import {StyleSheet, Text, TouchableNativeFeedback, View} from "react-native";
import Styles from "../primitives/Styles";
import {Icon} from "native-base";
import ClipboardList from "react-native-vector-icons/FontAwesome5";
import Call from "react-native-vector-icons/MaterialIcons";
import BackInTime from "react-native-vector-icons/Entypo";
import PropTypes from "prop-types";
import TaskStatusPicker from "./TaskStatusPicker";
import TypedTransition from "../../framework/routing/TypedTransition";
import CHSNavigator from "../../utility/CHSNavigator";
import IndividualSearchResultPaginatedView from "../individual/IndividualSearchSeasultPaginatedView";
import IndividualService from "../../service/IndividualService";
import {DateTimePickerAndroid} from "@react-native-community/datetimepicker";

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
        const dateOptions = {
            mode: 'date', //To only enable date selection
            display: 'calendar', //Type of DatePicker
            is24Hour: true,
            onChange: (event, date) => this.onDateChange(event, date, task),
            value: task.scheduledOn
        };
        DateTimePickerAndroid.open(dateOptions);
    }

    onDateChange(event, date, task) {
        if (event.type !== "dismissed") {
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
                <Text style={styles.textStyle}>{phoneNumberObs.getReadableValue()}</Text>
                <Icon style={styles.iconStyle} as={Call} name='call'
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
                    <View style={[styles.cardContainer]}>
                        <Text style={styles.textStyle}>{task.subject.nameString}</Text>
                        <Text style={styles.textStyle}>{this.I18n.t(task.subject.lowestAddressLevel.name)}</Text>
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
                    {task.isCallType() ? this.renderPhoneNumber(task) : null}
                    <Icon style={styles.iconStyle} as={ClipboardList}  name='clipboard-list'
                          onPress={() => this.onChangeStatusPress(task)}/>
                    <Icon style={styles.iconStyle} as={BackInTime} name='back-in-time'
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
        fontSize: 16
    }
});

export default TaskCard;
