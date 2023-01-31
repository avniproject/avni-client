import React from 'react';
import AbstractComponent from '../../framework/view/AbstractComponent';
import Reducers from '../../reducer';
import {TaskActionNames as Actions} from '../../action/task/TaskActions';
import _ from 'lodash';
import {StyleSheet, Text, TouchableNativeFeedback, View} from 'react-native';
import Styles from '../primitives/Styles';
import Icon from 'react-native-vector-icons/MaterialIcons';
import PropTypes from 'prop-types';
import TaskStatusPicker from './TaskStatusPicker';
import TypedTransition from '../../framework/routing/TypedTransition';
import CHSNavigator from '../../utility/CHSNavigator';
import IndividualSearchResultPaginatedView from '../individual/IndividualSearchResultPaginatedView';
import IndividualService from '../../service/IndividualService';
import {IconContainer} from './IconContainer';
import PhoneCall from '../../model/PhoneCall';
import CustomActivityIndicator from '../CustomActivityIndicator';
import SubjectRegisterFromTaskView from '../individual/SubjectRegisterFromTaskView';
import {DateTimePickerAndroid} from '@react-native-community/datetimepicker';
import AvniIcon from '../common/AvniIcon';
import General from '../../utility/General';

const CardSecondRow = function ({task, I18n}) {
    return (
        <View >
            <View style={styles.cardSecondRowContainer}>
                <Text style={styles.subTextStyle}>{I18n.t(task.taskStatus.name)}</Text>
            </View>
            <View style={styles.cardSecondRowContainer}>
                <Text style={styles.subTextStyle}>{General.formatDate(task.scheduledOn)}</Text>
            </View>
            <View style={styles.cardSecondRowContainer}>
                <Text style={[styles.subTextStyle]}>{task.getNonMobileNumberMetadataObservationValues().join(', ')}</Text>
            </View>
        </View>);
};

class TaskCard extends AbstractComponent {
    static propTypes = {
        task: PropTypes.object.isRequired,
        onChangeStatus: PropTypes.func
    };

    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.task);
    }

    onCallPress(mobileNumber, task) {
        // RNImmediatePhoneCall.immediatePhoneCall(_.toString(mobileNumber));
        PhoneCall.makeCall(mobileNumber, this,
            (displayProgressIndicator) => this.dispatchAction(Actions.TOGGLE_PROGRESS_INDICATOR, {displayProgressIndicator}));

        TypedTransition.from(this).with({
            headerTitle: this.I18n.t('subjectsWithMobileNumber', {number: _.toString(mobileNumber)}),
            results: this.getService(IndividualService).findAllWithMobileNumber(mobileNumber),
            onIndividualSelection: (source, subject) => this.goToSubjectDashboard(source, subject),
            taskUuid: task.uuid
        }).to(IndividualSearchResultPaginatedView, true);
    }

    goToSubjectDashboard(source, subject) {
        return CHSNavigator.navigateToProgramEnrolmentDashboardView(source, subject.uuid);
    }

    async onReschedulePress() {
        const task = this.props.task;
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
                        <Icon name={'chevron-right'} style={styles.iconStyle}/>
                    </View>
                </View>
            </TouchableNativeFeedback>
        ) : null;
    }

    renderCallType(task) {
        const phoneNumberObs = _.find(task.metadata, ({concept}) => concept.isMobileNo());
        const phoneNumber = _.isNil(phoneNumberObs) ? '' : phoneNumberObs.getReadableValue();
        return (
            <View style={styles.cardContainer}>
                <View style={styles.cardRowContainer}>
                    <View style={{width: 91}}>
                        <Text style={styles.textStyle}>{phoneNumber}</Text>
                    </View>
                    <View style={styles.iconContainer}>
                        <IconContainer
                            name="account-plus"
                            type={'MaterialCommunityIcons'}
                            onPress={() => TypedTransition.from(this).with({taskUuid: task.uuid}).to(SubjectRegisterFromTaskView, true)}
                        />
                        <IconContainer
                            name="call"
                            type={'MaterialIcons'}
                            onPress={() => _.isNil(phoneNumberObs) ? _.noop() :
                                this.onCallPress(phoneNumberObs.getReadableValue(), task)}
                        />
                        <IconContainer
                            name="clipboard-list"
                            type="FontAwesome5"
                            onPress={() => {this.props.onChangeStatus(task)}}/>
                        <IconContainer
                            onPress={this.onReschedulePress}
                            name="back-in-time"
                            type="Entypo"
                        />
                    </View>
                </View>
                <CardSecondRow task={task} I18n={this.I18n}/>
            </View>
        );
    }

    renderOpenSubjectType(task) {
        return (
            <View style={styles.cardContainer}>
                <View style={styles.cardRowContainer}>
                    <View style={{width: 200}}>
                        <Text style={styles.textStyle}>{task.name}</Text>
                    </View>
                    <View style={styles.iconContainer}>
                        <AvniIcon
                          style={styles.iconStyle}
                          name="clipboard-list"
                          type="FontAwesome5"
                          onPress={() => {this.props.onChangeStatus(task)}}
                        />
                        <IconContainer
                            name="back-in-time"
                            type="Entypo"
                            onPress={this.onReschedulePress}
                        />
                    </View>
                </View>
                <CardSecondRow task={task} I18n={this.I18n}/>
            </View>
        );
    }

    render() {
        const task = this.props.task;
        return (
            <View style={styles.container} key={task.uuid}>
                <CustomActivityIndicator loading={this.state.displayProgressIndicator}/>
                {task.isCallType() ? this.renderCallType(task) : this.renderOpenSubjectType(task)}
                {this.renderSubjectDetails(task)}
            </View>
        );
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
        backgroundColor: '#DBDBDB'
    },
    cardRowContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#DBDBDB',
    },
    cardSecondRowContainer: {
        flexDirection: 'row',
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
    subTextStyle: {
        fontSize: Styles.smallTextSize,
        fontStyle: 'normal',
        fontFamily: 'Inter',
        color: '#07070799',
        lineHeight: 16
    },
    iconStyle: {
        color: '#29869A',
        alignSelf: 'center',
        fontSize: 24
    }
});

export default TaskCard;
