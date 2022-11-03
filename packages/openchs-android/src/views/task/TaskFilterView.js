import _ from "lodash";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Path from "../../framework/routing/Path";
import {Actions} from "../../action/task/TaskFilterActions";
import Styles from "../primitives/Styles";
import AppHeader from "../common/AppHeader";
import CHSContent from "../common/CHSContent";
import {Text, TouchableOpacity, View} from "react-native";
import CHSContainer from "../common/CHSContainer";
import React from "react";
import Reducers from "../../reducer";
import SingleSelectFilter from "../filter/SingleSelectFilter";
import {FilterActionNames} from "../../action/mydashboard/FiltersActions";

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
        return <CHSContainer style={{backgroundColor: Styles.whiteColor}}>
            <AppHeader title={this.I18n.t('filter')}/>
            <CHSContent>
                <View style={{backgroundColor: Styles.whiteColor}}>
                    <SingleSelectFilter filter={subjectTypeSelectFilter} onSelect={(subjectTypeName) => {
                        this.dispatchAction(FilterActionNames.ADD_SUBJECT_TYPE, {subjectTypeName})
                    }}/>
                </View>
            </CHSContent>
        </CHSContainer>;
    }
}

export default TaskFilterView;
