import {Alert, Clipboard, Text, View} from "react-native";
import PropTypes from 'prop-types';
import React, {Component} from 'react';
import PathRegistry from './framework/routing/PathRegistry';
import {EntityMetaData} from 'openchs-models';
import './views';
import _ from "lodash";
import {RegisterAndScheduleJobs} from "./AvniBackgroundJob";
import ErrorHandler from "./utility/ErrorHandler";
import FileSystem from "./model/FileSystem";
import GlobalContext from "./GlobalContext";
import AppConfig from "./framework/AppConfig";
import RNRestart from 'react-native-restart';
import AppStore from "./store/AppStore";
import RealmFactory from "./framework/db/RealmFactory";

let error;
try {
    const globalContext = GlobalContext.getInstance();
    if (!globalContext.isInitialised()) {
        globalContext.initialiseGlobalContext(AppStore, RealmFactory);
        globalContext.routes = PathRegistry.routes();
    }

    const entitySyncStatusService = globalContext.beanRegistry.getService("entitySyncStatusService");
    entitySyncStatusService.setup(EntityMetaData.model());

    RegisterAndScheduleJobs();
} catch (e) {
    console.log("App", e);
    error = e;
}

class App extends Component {
    static childContextTypes = {
        getService: PropTypes.func.isRequired,
        getDB: PropTypes.func.isRequired,
        getStore: PropTypes.func.isRequired,
    };

    constructor(props, context) {
        super(props, context);
        FileSystem.init();
        this.getBean = this.getBean.bind(this);
        this.handleError = this.handleError.bind(this);
        ErrorHandler.set(this.handleError);
        this.state = {error};
    }

    handleError(error, stacktrace) {
        //It is possible for App to not be available during this time, so check if state is available before setting to it
        this.setState && this.setState({error, stacktrace});
    }

    getChildContext = () => ({
        getDB: () => GlobalContext.getInstance().db,
        getService: (serviceName) => {
            return GlobalContext.getInstance().beanRegistry.getService(serviceName);
        },
        getStore: () => GlobalContext.getInstance().reduxStore,
    });

    renderError() {
        const clipboardString = `${this.state.error.message}\nStacktrace:${this.state.stacktrace}`;
        console.log("App", "renderError", clipboardString);

        if (AppConfig.inNonDevMode()) {
            Alert.alert("App will restart now", this.state.error.message,
                [
                    {
                        text: "Copy error and Restart",
                        onPress: () => {
                            Clipboard.setString(clipboardString);
                            RNRestart.Restart();
                        }
                    }
                ],
                {cancelable: false}
            );
        }
        return <View/>;
    }

    getBean(name) {
        return GlobalContext.getInstance().beanRegistry.getService(name);
    }

    componentDidMount() {
        console.log("App", "componentDidMount");
    }

    render() {
        if (this.state.error) {
            return this.renderError();
        }
        if (!_.isNil(GlobalContext.getInstance().routes)) {
            return GlobalContext.getInstance().routes
        }
        return (<Text>Something Went Wrong</Text>);
    }
}

export default App;
