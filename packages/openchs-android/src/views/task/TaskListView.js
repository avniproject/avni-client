import React from 'react';
import Path from "../../framework/routing/Path";
import AbstractComponent from "../../framework/view/AbstractComponent";
import PropTypes from "prop-types";
import General from "../../utility/General";
import CHSContainer from "../common/CHSContainer";
import Colors from "../primitives/Colors";
import AppHeader from "../common/AppHeader";
import {Dimensions, SafeAreaView, StyleSheet, Text, View} from "react-native";
import ListView from "deprecated-react-native-listview";
import TaskCard from "./TaskCard";
import Reducers from "../../reducer";
import TypedTransition from "../../framework/routing/TypedTransition";
import TaskFilterView from "./TaskFilterView";
import FloatingButton from "../primitives/FloatingButton";
import {Actions, TaskListActions} from "../../action/task/TaskListActions";
import {Actions as TaskFilterActions} from "../../action/task/TaskFilterActions";
import TaskFilter from "../../model/TaskFilter";
import CHSContent from "../common/CHSContent";
import {Badge, Button, Icon, IconButton, CloseIcon} from 'native-base';
import Fonts from "../primitives/Fonts";
import ZeroResults from "../common/ZeroResults";
import {TaskType, Task} from 'openchs-models';
import ListViewHelper from "../../utility/ListViewHelper";

const FilterSummaryItem = function ({text}) {
    if (_.isNil(text) || text.length === 0)
        return null;
    return <Badge info style={styles.filterItem}><Text>{text}</Text></Badge>;
}

const TaskFilterSummary = function ({taskFilter, I18n, onClearFilter}) {
    return <View style={styles.filterSummaryContainer}>
        <View style={styles.filterSummary}>
            <Text style={[Fonts.typography("paperFontButton"), {color: Colors.TextOnPrimaryColor, marginTop: 5}]}>{I18n.t("filters")}</Text>
            {taskFilter.taskType && <FilterSummaryItem text={I18n.t(taskFilter.taskType.name)}/>}
            <FilterSummaryItem text={taskFilter.taskStatuses.map((x) => I18n.t(x.name)).join(",")}/>
            <FilterSummaryItem text={I18n.t(TaskFilter.getTaskMetadataDisplayValues(taskFilter, I18n))}/>
            {taskFilter.taskScheduledDate && <FilterSummaryItem text={`${I18n.t("scheduled")}: ${General.formatDate(taskFilter.taskScheduledDate)}`}/>}
            {taskFilter.taskCompletedDate && <FilterSummaryItem text={`${I18n.t("completedOn")}: ${General.formatDate(taskFilter.taskCompletedDate)}`}/>}
        </View>
        <IconButton transparent onPress={() => onClearFilter()} style={{paddingBottom: 22, marginTop: 10, flex: 0.10, marginRight: 10, height: 20}}>
            <CloseIcon style={{
                color: Colors.SecondaryActionButtonColor
            }}/></IconButton>
    </View>;
}

@Path('/taskListView')
class TaskListView extends AbstractComponent {

    static propTypes = {
        params: PropTypes.object.isRequired
    }

    static paramTypes = {
        backFunction: PropTypes.func,
        taskTypeType: PropTypes.string.isRequired,
        indicatorActionName: PropTypes.string
    };

    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.taskList);
        this.state = TaskListActions.getInitialState(context);
    }

    viewName() {
        return 'TaskListView';
    }

    UNSAFE_componentWillMount() {
        setTimeout(() => {
            super.UNSAFE_componentWillMount();
            this.dispatchAction(Actions.ON_LOAD, {filter: TaskFilter.createNoCriteriaFilter(this.props.params.taskTypeType)});
            this.dispatchAction(this.props.params.indicatorActionName, {loading: false});
        }, 0);
    }

    didFocus() {
        super.didFocus();
        setTimeout(() => {
            this.dispatchAction(Actions.ON_REFRESH);
            this.dispatchAction(this.props.params.indicatorActionName, {loading: false});
        }, 0);
    }

    onBackPress() {
        this.props.params.backFunction();
    }

    headerElement(name, width, isCenter = true) {
        const style = isCenter ? {width, alignItems: 'center', justifyContent: 'center'} : {width};
        return (
            <View style={style}>
                <Text style={styles.headerTextStyle}>{name}</Text>
            </View>
        )
    }

    renderCallHeader() {
        const {width} = Dimensions.get('window');
        const iconWidth = (width - 147) / 3;
        return (
            <View style={styles.container}>
                <View style={styles.cardContainer}>
                    {this.headerElement("", 91, false)}
                    <View style={styles.iconContainer}>
                        {this.headerElement(this.I18n.t('register'), iconWidth)}
                        {this.headerElement(this.I18n.t('call'), iconWidth)}
                        {this.headerElement(this.I18n.t('mark'), iconWidth)}
                        {this.headerElement(this.I18n.t('reschedule'), iconWidth)}
                    </View>
                </View>
            </View>
        );
    }

    renderOpenSubjectHeader() {
        const {width} = Dimensions.get('window');
        const iconWidth = (width - 256) / 2;
        return (
            <View style={styles.container}>
                <View style={styles.cardContainer}>
                    {this.headerElement("", 200, false)}
                    <View style={styles.iconContainer}>
                        {this.headerElement(this.I18n.t('mark'), iconWidth)}
                        {this.headerElement(this.I18n.t('reschedule'), iconWidth)}
                    </View>
                </View>
            </View>
        );
    }

    renderHeader() {
        return this.props.params.taskTypeType === TaskType.TaskTypeName.Call ? this.renderCallHeader() : this.renderOpenSubjectHeader();
    }

    onClearFilter() {
        const action = {taskType: this.state.filter.taskType};
        this.dispatchAction(TaskFilterActions.ON_CLEAR, action);
        this.dispatchAction(Actions.ON_FILTER_CLEAR, action);
    }

    render() {
        General.logDebug(this.viewName(), "render");
        const {results, filter} = this.state;
        const dataSource = ListViewHelper.getDataSource(results);

        return (
            <CHSContainer theme={{iconFamily: 'MaterialIcons'}}
                          style={{backgroundColor: Colors.GreyContentBackground}}>
                <AppHeader title={this.I18n.t('openTasks')} func={this.onBackPress.bind(this)}/>
                <CHSContent>
                    <TaskFilterSummary I18n={this.I18n} taskFilter={filter}
                                       onClearFilter={() => this.onClearFilter()}/>
                    <SafeAreaView style={{flex: 1}}>
                        <ListView
                            enableEmptySections={true}
                            dataSource={dataSource}
                            pageSize={1}
                            initialListSize={1}
                            removeClippedSubviews={true}
                            renderRow={(taskRealmObject, index) => <TaskCard task={new Task(taskRealmObject)}/>}
                            renderHeader={() => this.renderHeader()}
                        />
                        <ZeroResults count={results.length}/>
                    </SafeAreaView>
                </CHSContent>
                <FloatingButton buttonTextKey="filter"
                                onClick={() => TypedTransition.from(this).with({taskType: filter.taskType}).to(TaskFilterView, true)}/>
            </CHSContainer>
        )
    }
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'column',
        marginTop: 16,
        marginBottom: 6,
        marginHorizontal: 16,
    },
    cardContainer: {
        paddingHorizontal: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    iconContainer: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'space-around'
    },
    headerTextStyle: {
        fontSize: 12,
        fontStyle: 'normal',
        fontFamily: 'Inter',
        color: '#6C6C6C'
    },
    filterSummaryContainer: {
        paddingTop: 10,
        flexDirection: "row",
        justifyContent: "space-between",
        backgroundColor: Colors.DarkPrimaryColor,
        paddingBottom: 10
    },
    filterSummary: {
        flexDirection: "row",
        alignItems: "flex-start",
        paddingHorizontal: 20,
        flexWrap: "wrap", flex: 0.8
    },
    filterItem: {
        marginLeft: 10,
        marginTop: 5,
        borderRadius: 3,
        flexDirection: "row",
        alignItems: "center"
    }
});

export default TaskListView;
