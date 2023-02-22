import React from 'react';
import AbstractComponent from "../../framework/view/AbstractComponent";
import Reducers from "../../reducer";
import {Modal, View} from 'react-native';
import DropDownPicker from "react-native-dropdown-picker";
import _ from "lodash";
import {TaskActionNames as Actions} from "../../action/task/TaskActions";
import PropTypes from "prop-types";
import TypedTransition from "../../framework/routing/TypedTransition";
import TaskFormView from "./TaskFormView";
import Icon from "react-native-vector-icons/MaterialIcons";
import Colors from '../primitives/Colors';
import {Actions as TaskListActions} from '../../action/task/TaskListActions';
class TaskStatusPicker extends AbstractComponent {

    static propTypes = {
        task: PropTypes.object.isRequired,
    };

    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.task);
        this.setValue = this.setValue.bind(this);
    }

    UNSAFE_componentWillMount() {
        super.UNSAFE_componentWillMount();
        this.dispatchAction(Actions.ON_STATUS_TOGGLE, {task: this.props.task});
    }

    setOpen(open) {
        //do nothing
    }

    setValue(callback) {
        this.onStatusSelect(callback(this.props.task.taskStatus.uuid));
    }

    onStatusSelect(value) {
        const moveToDetailsPage = (taskUUID, statusUUID) => TypedTransition.from(this).with({
            taskUUID,
            statusUUID
        }).bookmark().to(TaskFormView, true);
        this.dispatchAction(Actions.ON_STATUS_CHANGE,
            {statusUUID: value, task: this.props.task, moveToDetailsPage});
        this.dispatchAction(TaskListActions.ON_HIDE_TASK_STATUS_CHANGE_MODAL, {
            task: this.props.task
        })
    }


    render() {
        console.log('rendering task', this.props.task.uuid);
        return (
            <Modal transparent={true}
                   onRequestClose={_.noop}
            >
                <View style={{
                    flex: 1,
                    flexWrap: 'nowrap',
                    backgroundColor: 'rgba(68,68,68,0.25)',
                    paddingHorizontal: 20,
                    justifyContent: 'center'
                }}>
                    <View style={{
                        backgroundColor: '#FFF',
                        padding: 8,
                        borderRadius: 5,
                        paddingBottom: (30 * _.size(this.state.taskStatusList))
                    }}>
                        <View style={{alignItems: 'flex-end'}}>
                            <Icon
                                name='close'
                                onPress={() => this.dispatchAction(TaskListActions.ON_HIDE_TASK_STATUS_CHANGE_MODAL, {
                                    task: this.props.task
                                })}
                                style={{
                                    color: Colors.DefaultPrimaryColor,
                                    opacity: 0.8,
                                    fontSize: 24,
                                    padding: 8
                                }}
                            />
                        </View>
                        <View style={{height: 100, width: '100%'}}>
                            <DropDownPicker
                                items={this.state.taskStatusList}
                                value={this.props.task.taskStatus.uuid}
                                open={true}
                                setValue={this.setValue}
                                setOpen={this.setOpen}
                                containerStyle={{height: 40}}
                                style={{backgroundColor: '#fafafa'}}
                                labelStyle={{backgroundColor: '#fafafa', justifyContent: 'flex-start'}}
                            />
                        </View>
                    </View>
                </View>
            </Modal>
        )
    }
}


export default TaskStatusPicker;
