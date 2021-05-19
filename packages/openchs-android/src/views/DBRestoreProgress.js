import React from 'react';
import AbstractComponent from "../framework/view/AbstractComponent";
import _ from "lodash";
import ProgressBarView from "./ProgressBarView";
import Reducers from "../reducer";
import General from "../utility/General";
import {LoginActionsNames as Actions} from "../action/LoginActions";
import {Alert} from "react-native";
import CHSNavigator from "../utility/CHSNavigator";


class DBRestoreProgress extends AbstractComponent {

    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.loginActions);
    }

    render() {
        return (
            <ProgressBarView progress={this.state.percentProgress / 100} message={this.state.dumpRestoreMessage} syncing={this.state.dumpRestoring} onPress={_.noop}
                             notifyUserOnCompletion={false}/>
        );
    }
}


export default DBRestoreProgress;
