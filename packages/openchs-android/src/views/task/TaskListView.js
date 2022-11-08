import React from 'react';
import Path from "../../framework/routing/Path";
import AbstractComponent from "../../framework/view/AbstractComponent";
import PropTypes from "prop-types";
import General from "../../utility/General";
import CHSContainer from "../common/CHSContainer";
import Colors from "../primitives/Colors";
import AppHeader from "../common/AppHeader";
import {Dimensions, FlatList, SafeAreaView, StyleSheet, Text, View} from "react-native";
import TaskCard from "./TaskCard";
import Reducers from "../../reducer";
import TypedTransition from "../../framework/routing/TypedTransition";
import TaskFilterView from "./TaskFilterView";
import FloatingButton from "../primitives/FloatingButton";
import {Actions} from "../../action/task/TaskListActions";
import TaskFilter from "../../model/TaskFilter";

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
        this.state = {};
    }

    viewName() {
        return 'TaskListView';
    }

    dispatchLoad(filter) {
        setTimeout(() => {
            this.dispatchAction(Actions.ON_FILTER_APPLY, {filter: filter});
            this.dispatchAction(this.props.params.indicatorActionName, {loading: false});
        }, 0);
    }

    componentWillMount() {
        this.dispatchLoad(TaskFilter.createNoCriteriaFilter(this.props.params.taskTypeType));
        super.componentWillMount();
    }

    didFocus() {
        super.didFocus();
        this.dispatchLoad(this.state.filter);
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
                    {this.headerElement(this.I18n.t('phone'), 91, false)}
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
                    {this.headerElement(this.I18n.t('taskName'), 200, false)}
                    <View style={styles.iconContainer}>
                        {this.headerElement(this.I18n.t('mark'), iconWidth)}
                        {this.headerElement(this.I18n.t('reschedule'), iconWidth)}
                    </View>
                </View>
            </View>
        );
    }

    renderHeader() {
        return this.props.params.taskTypeType === 'call' ? this.renderCallHeader() : this.renderOpenSubjectHeader();
    }


    render() {
        General.logDebug(this.viewName(), "render");
        return (
            <CHSContainer theme={{iconFamily: 'MaterialIcons'}}
                          style={{backgroundColor: Colors.GreyContentBackground}}>
                <AppHeader title={this.I18n.t('openTasks')} func={this.onBackPress.bind(this)}/>
                <SafeAreaView style={{flex: 1}}>
                    <FlatList
                        data={this.state.results}
                        keyExtractor={(item) => item.uuid}
                        enableEmptySections={true}
                        renderItem={({item}) => <TaskCard task={item}/>}
                        ListHeaderComponent={this.renderHeader()}
                    />
                </SafeAreaView>
                <FloatingButton buttonTextKey="filter" onClick={() => TypedTransition.from(this).to(TaskFilterView)}/>
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
});

export default TaskListView;
