import AbstractComponent from "../../framework/view/AbstractComponent";
import Path from "../../framework/routing/Path";
import {Actions} from "../../action/task/TaskFilterActions";
import {Actions as TaskListActions} from "../../action/task/TaskListActions";
import Styles from "../primitives/Styles";
import AppHeader from "../common/AppHeader";
import {SafeAreaView, Text, TextInput, View} from "react-native";
import CHSContainer from "../common/CHSContainer";
import React from "react";
import Reducers from "../../reducer";
import RadioGroup, {RadioLabelValue} from "../primitives/RadioGroup";
import DatePicker from "../primitives/DatePicker";
import {Concept, BaseEntity} from 'openchs-models';
import _ from "lodash";
import Colors from "../primitives/Colors";
import General from "../../utility/General";
import FloatingButton from "../primitives/FloatingButton";
import TaskFilter from "../../model/TaskFilter";
import CHSContent from "../common/CHSContent";
import Separator from "../primitives/Separator";

const numericFieldStyle = [{
    marginVertical: 0,
    paddingVertical: 5
}, Styles.formBodyText];

const TaskMetadataFilter = function ({taskMetadataFields, taskMetadataValues, dispatch, I18n}) {
    return taskMetadataFields.map((c) => {
        switch (c.datatype) {
            case Concept.dataType.Numeric:
                return <View style={{marginTop: 20}}>
                    <Text style={{fontSize: 15, color: Styles.greyText}}>{I18n.t(c.name)}</Text>
                    <TextInput style={numericFieldStyle} underlineColorAndroid={Colors.InputBorderNormal} keyboardType='numeric'
                               value={_.toString(taskMetadataValues[c.uuid])}
                               onChangeText={(text) => dispatch(Actions.ON_METADATA_VALUE_CHANGE, {concept: c, value: text})}/>
                </View>;
            case Concept.dataType.Text:
                return <View style={{marginTop: 20}}>
                    <Text style={{fontSize: 15, color: Styles.greyText}}>{I18n.t(c.name)}</Text>
                    <TextInput style={numericFieldStyle} underlineColorAndroid={Colors.InputBorderNormal}
                               value={taskMetadataValues[c.uuid]}
                               onChangeText={(text) => dispatch(Actions.ON_METADATA_VALUE_CHANGE, {concept: c, value: text})}/>
                </View>;
            case Concept.dataType.Coded:
                const answers = c.getAnswers();
                return <RadioGroup onPress={(rlv) => dispatch(Actions.ON_METADATA_CODED_VALUE_CHANGE, {concept: c, chosenAnswerConcept: rlv.value})}
                                   inPairs={true}
                                   selectionFn={(selectedVal) => BaseEntity.collectionHasEntity(taskMetadataValues[c.uuid], selectedVal)}
                                   labelValuePairs={answers.map((a) => new RadioLabelValue(a.name, a, false))}
                                   labelKey={c.name} multiSelect={true}/>;
            default:
                return null;
        }
    });
}

@Path('/taskFilterView')
class TaskFilterView extends AbstractComponent {
    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.taskFilter);
    }

    componentWillMount() {
        this.dispatchAction(Actions.ON_LOAD);
        super.componentWillMount();
    }

    onApplyFilter() {
        this.dispatchAction(TaskListActions.ON_FILTER_APPLY,
            {filter: TaskFilter.fromTaskFilterState(this.state)});
        this.goBack();
    }

    render() {
        General.logDebug("TaskFilterView", "render");
        const {
            allTaskTypes, selectedTaskType, allTaskStatuses, selectedTaskStatuses, datePickerMode,
            taskMetadataFields, taskCreatedDate, taskCompletedDate, taskMetadataValues
        } = this.state;

        const taskTypeLVPairs = allTaskTypes.map((x) => new RadioLabelValue(x.name, x, false));
        const taskStatusLVPairs = allTaskStatuses.map((x) => new RadioLabelValue(x.name, x, false));
        return <CHSContainer style={{backgroundColor: Styles.whiteColor}}>
            <AppHeader title={this.I18n.t('filter')}/>
            <CHSContent>
                <SafeAreaView style={{flex: 1, padding: 20}}>
                    <RadioGroup labelKey="taskType"
                                labelValuePairs={taskTypeLVPairs}
                                inPairs={true}
                                multiSelect={false}
                                onPress={(rlv) => this.dispatchAction(Actions.ON_TASK_TYPE_CHANGE, rlv.value)}
                                selectionFn={(selectedVal) => selectedTaskType.uuid === selectedVal.uuid}
                                mandatory={false}/>
                    <RadioGroup labelKey="taskStatus"
                                style={{marginTop: 20}}
                                labelValuePairs={taskStatusLVPairs}
                                inPairs={true}
                                multiSelect={true}
                                onPress={(rlv) => this.dispatchAction(Actions.ON_TASK_STATUS_CHANGE, rlv.value)}
                                selectionFn={(selectedVal) => BaseEntity.collectionHasEntity(selectedTaskStatuses, selectedVal)}
                                mandatory={false}/>
                    <View style={{flexDirection: "row", marginTop: 20}}>
                        <View>
                            <Text style={{fontSize: 15, color: Styles.greyText}}>{this.I18n.t("taskCreatedOn")}</Text>
                            <DatePicker dateValue={taskCreatedDate}
                                        datePickerMode={datePickerMode}
                                        actionObject={{}}
                                        pickTime={false}
                                        actionName={Actions.ON_TASK_CREATED_DATE_CHANGE}/>
                        </View>
                        <View style={{marginLeft: 50}}>
                            <Text style={{fontSize: 15, color: Styles.greyText}}>{this.I18n.t("taskCompletedOn")}</Text>
                            <DatePicker dateValue={taskCompletedDate}
                                        datePickerMode={datePickerMode}
                                        actionObject={{}}
                                        pickTime={false}
                                        actionName={Actions.ON_TASK_COMPLETED_DATE_CHANGE}/>
                        </View>
                    </View>
                    <View style={{marginTop: 20}}>
                        <TaskMetadataFilter taskMetadataFields={taskMetadataFields}
                                            taskMetadataValues={taskMetadataValues}
                                            dispatch={(actionName, action) => this.dispatchAction(actionName, action)} I18n={this.I18n}/>
                    </View>
                </SafeAreaView>
                <Separator height={170} backgroundColor={Styles.whiteColor}/>
            </CHSContent>
            <FloatingButton buttonTextKey={"apply"} onClick={() => this.onApplyFilter()}/>
        </CHSContainer>;
    }
}

export default TaskFilterView;
