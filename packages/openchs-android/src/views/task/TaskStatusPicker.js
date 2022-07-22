import React from 'react';
import AbstractComponent from "../../framework/view/AbstractComponent";
import Reducers from "../../reducer";
import {Modal, View} from 'react-native';
import DropDownPicker from "react-native-dropdown-picker";
import _ from "lodash";
import EntityService from "../../service/EntityService";
import {TaskStatus} from 'avni-models';
import {TaskActionNames as Actions} from "../../action/task/TaskActions";
import PropTypes from "prop-types";
import TypedTransition from "../../framework/routing/TypedTransition";
import TaskFormView from "./TaskFormView";

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
            {statusUUID: value, task: this.props.task, moveToDetailsPage});
    }


    render() {
        const options = this.getService(EntityService).findAll(TaskStatus.schema.name)
            .map(_.identity)
            .map(({name, uuid}) => ({label: name, value: uuid}));
        return (
            <Modal transparent={true}
                   onRequestClose={_.noop}
                   visible={this.state.displayTaskStatusSelector}
                   style={{marginTop: 40}}>
                <View style={{
                    flex: 1,
                    flexDirection: 'column',
                    flexWrap: 'nowrap',
                    alignItems: 'center',
                    backgroundColor: 'rgba(68,68,68,0.25)',
                    paddingHorizontal: 20
                }}>
                    <View style={{flex: .5}}/>
                    <View style={{height: 100, width: '100%'}}>
                        <DropDownPicker
                            items={options}
                            defaultValue={this.props.task.taskStatus.uuid}
                            containerStyle={{height: 40}}
                            style={{backgroundColor: '#fafafa'}}
                            itemStyle={{justifyContent: 'flex-start'}}
                            dropDownStyle={{backgroundColor: '#fafafa'}}
                            onChangeItem={this.onStatusSelect.bind(this)}
                        />
                    </View>
                </View>
            </Modal>
        )
    }
}


export default TaskStatusPicker;
