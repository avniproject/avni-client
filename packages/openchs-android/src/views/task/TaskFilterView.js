import AbstractComponent from "../../framework/view/AbstractComponent";
import Path from "../../framework/routing/Path";
import {Actions} from "../../action/task/TaskFilterActions";
import Styles from "../primitives/Styles";
import AppHeader from "../common/AppHeader";
import CHSContent from "../common/CHSContent";
import {View} from "react-native";
import CHSContainer from "../common/CHSContainer";
import React from "react";
import Reducers from "../../reducer";
import RadioGroup, {RadioLabelValue} from "../primitives/RadioGroup";
import DateFormElement from "../form/formElement/DateFormElement";
import _ from "lodash";
import DatePicker from "../primitives/DatePicker";

@Path('/taskFilterView')
class TaskFilterView extends AbstractComponent {
    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.taskFilter);
    }

    componentWillMount() {
        this.dispatchAction(Actions.ON_LOAD);
        super.componentWillMount();
    }

    render() {
        const {allTaskTypes, selectedTaskType, allTaskStatuses, selectedTaskStatuses, datePickerMode,
            taskMetadataFields, taskCreatedDate, taskCompletedDate} = this.state;
        const taskTypeLVPairs = allTaskTypes.map((x) => new RadioLabelValue(this.I18n.t(x.name), x, false));
        const taskStatusLVPairs = allTaskStatuses.map((x) => new RadioLabelValue(this.I18n.t(x.name), x, false));
        return <CHSContainer style={{backgroundColor: Styles.whiteColor}}>
            <AppHeader title={this.I18n.t('filter')}/>
            <CHSContent>
                <View style={{backgroundColor: Styles.whiteColor}}>
                    <RadioGroup labelKey="taskType"
                                labelValuePairs={taskTypeLVPairs}
                                inPairs={true}
                                multiSelect={false}
                                onPress={(rlv) => this.dispatchAction()}
                                selectionFn={(selectedVal) => selectedVal.equals(selectedTaskType)}
                                mandatory={false}/>
                    <RadioGroup labelKey="taskStatus"
                                labelValuePairs={taskStatusLVPairs}
                                inPairs={true}
                                multiSelect={true}
                                onPress={(rlv) => this.dispatchAction()}
                                selectionFn={(selectedVal) => selectedTaskStatuses.includes(selectedVal)}
                                mandatory={false}/>
                    <DatePicker dateValue={taskCreatedDate}
                                datePickerMode={datePickerMode}
                                actionObject={{}}
                                actionName={Actions.ON_TASK_CREATED_DATE_CHANGE}/>
                    <DatePicker dateValue={taskCompletedDate}
                                datePickerMode={datePickerMode}
                                actionObject={{}}
                                actionName={Actions.ON_TASK_COMPLETED_DATE_CHANGE}/>
                </View>
            </CHSContent>
        </CHSContainer>;
    }
}

export default TaskFilterView;
