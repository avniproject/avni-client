import AbstractComponent from "../../framework/view/AbstractComponent";
import Path from "../../framework/routing/Path";
import {Actions} from "../../action/task/TaskFilterActions";
import Styles from "../primitives/Styles";
import AppHeader from "../common/AppHeader";
import CHSContent from "../common/CHSContent";
import {Text, TextInput, View} from "react-native";
import CHSContainer from "../common/CHSContainer";
import React from "react";
import Reducers from "../../reducer";
import RadioGroup, {RadioLabelValue} from "../primitives/RadioGroup";
import DatePicker from "../primitives/DatePicker";
import {Concept} from 'openchs-models';
import _ from "lodash";
import Colors from "../primitives/Colors";

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
                return <RadioGroup onPress={(rlv) => dispatch(Actions.ON_METADATA_VALUE_CHANGE, {concept: c, chosenAnswerConcept: rlv.value})}
                                   selectionFn={(selectedVal) => _.isEqual(selectedVal, taskMetadataFields[c.uuid])}
                                   labelValuePairs={answers.map((a) => new RadioLabelValue(a.name, a, false))}
                                   labelKey={c.name} multiSelect={false}/>;
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

    render() {
        const {
            allTaskTypes, selectedTaskType, allTaskStatuses, selectedTaskStatuses, datePickerMode,
            taskMetadataFields, taskCreatedDate, taskCompletedDate, taskMetadataValues
        } = this.state;
        const taskTypeLVPairs = allTaskTypes.map((x) => new RadioLabelValue(x.name, x, false));
        const taskStatusLVPairs = allTaskStatuses.map((x) => new RadioLabelValue(x.name, x, false));
        return <CHSContainer style={{backgroundColor: Styles.whiteColor}}>
            <AppHeader title={this.I18n.t('filter')}/>
            <CHSContent>
                <View style={{backgroundColor: Styles.whiteColor, padding: 20}}>
                    <RadioGroup labelKey="taskType"
                                labelValuePairs={taskTypeLVPairs}
                                inPairs={true}
                                multiSelect={false}
                                onPress={(rlv) => this.dispatchAction(Actions.ON_TASK_TYPE_CHANGE, rlv.value)}
                                selectionFn={(selectedVal) => selectedVal.equals(selectedTaskType)}
                                mandatory={false}/>
                    <RadioGroup labelKey="taskStatus"
                                labelValuePairs={taskStatusLVPairs}
                                inPairs={true}
                                multiSelect={true}
                                onPress={(rlv) => this.dispatchAction(Actions.ON_TASK_STATUS_CHANGE, rlv.value)}
                                selectionFn={(selectedVal) => selectedTaskStatuses.includes(selectedVal)}
                                mandatory={false}/>
                    <View style={{flexDirection: "row", marginTop: 20}}>
                        <View>
                            <Text style={{fontSize: 15, color: Styles.greyText}}>{this.I18n.t("taskCreatedOn")}</Text>
                            <DatePicker dateValue={taskCreatedDate}
                                        datePickerMode={datePickerMode}
                                        actionObject={{}}
                                        actionName={Actions.ON_TASK_CREATED_DATE_CHANGE}/>
                        </View>
                        <View style={{marginLeft: 50}}>
                            <Text style={{fontSize: 15, color: Styles.greyText}}>{this.I18n.t("taskCompletedOn")}</Text>
                            <DatePicker dateValue={taskCompletedDate}
                                        datePickerMode={datePickerMode}
                                        actionObject={{}}
                                        actionName={Actions.ON_TASK_COMPLETED_DATE_CHANGE}/>
                        </View>
                    </View>
                    <TaskMetadataFilter taskMetadataFields={taskMetadataFields}
                                        taskMetadataValues={taskMetadataValues} dispatch={this.dispatchAction} I18n={this.I18n}/>
                </View>
            </CHSContent>
        </CHSContainer>
            ;
    }
}

export default TaskFilterView;
