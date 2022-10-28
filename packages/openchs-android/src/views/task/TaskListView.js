import React from 'react';
import Path from "../../framework/routing/Path";
import AbstractComponent from "../../framework/view/AbstractComponent";
import PropTypes from "prop-types";
import General from "../../utility/General";
import CHSContainer from "../common/CHSContainer";
import Colors from "../primitives/Colors";
import AppHeader from "../common/AppHeader";
import {FlatList, SafeAreaView} from "react-native";
import TaskCard from "./TaskCard";
import Reducers from "../../reducer";
import _ from 'lodash';

@Path('/taskListView')
class TaskListView extends AbstractComponent {

    static propTypes = {
        results: PropTypes.object.isRequired,
        backFunction: PropTypes.func
    };

    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.task);
    }

    viewName() {
        return 'TaskListView';
    }

    componentWillMount() {
        super.componentWillMount();
    }

    componentDidMount() {
        if (this.props.indicatorActionName) {
            setTimeout(() => this.dispatchAction(this.props.indicatorActionName, {loading: false}), 0);
        }
    }

    didFocus() {
        super.didFocus();
    }

    onBackPress() {
        this.props.backFunction();
    }


    render() {
        General.logDebug(this.viewName(), "render");
        return (
            <CHSContainer theme={{iconFamily: 'MaterialIcons'}}
                          style={{backgroundColor: Colors.GreyContentBackground}}>
                <AppHeader title={this.I18n.t('openTasks')} func={this.onBackPress.bind(this)}/>
                <SafeAreaView style={{flex: 1}}>
                    <FlatList
                        data={this.props.results}
                        keyExtractor={(item) => item.uuid}
                        enableEmptySections={true}
                        renderItem={({item}) => <TaskCard task={item}/>}
                    />
                </SafeAreaView>
            </CHSContainer>
        )
    }
}

export default TaskListView;
