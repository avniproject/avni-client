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
import {Icon} from "native-base";

class TaskStatusPicker extends AbstractComponent {

    static propTypes = {
        task: PropTypes.object.isRequired,
    };

    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.task);
    }

    onStatusSelect({value}) {
        const moveToDetailsPage = (taskUUID, statusUUID) => TypedTransition.from(this).with({
            taskUUID,
            statusUUID
        }).bookmark().to(TaskFormView, true);
        this.dispatchAction(Actions.ON_STATUS_CHANGE,
            {statusUUID: value, task: this.state.task, moveToDetailsPage});
    }


    render() {
        return (
            <Modal transparent={true}
                   onRequestClose={_.noop}
                   visible={this.state.displayTaskStatusSelector}
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
                                onPress={() => this.dispatchAction(Actions.ON_STATUS_TOGGLE, {
                                    display: false,
                                    task: this.state.task
                                })}
                            />
                        </View>
                        <View style={{height: 100, width: '100%'}}>
                            <DropDownPicker
                                items={this.state.taskStatusList}
                                defaultValue={this.state.task.taskStatus.uuid}
                                containerStyle={{height: 40}}
                                style={{backgroundColor: '#fafafa'}}
                                itemStyle={{justifyContent: 'flex-start'}}
                                dropDownStyle={{backgroundColor: '#fafafa'}}
                                onChangeItem={this.onStatusSelect.bind(this)}
                            />
                        </View>
                    </View>
                </View>
            </Modal>
        )
    }
}


export default TaskStatusPicker;
