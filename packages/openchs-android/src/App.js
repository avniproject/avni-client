import {Alert, Clipboard, NativeModules, Text, View} from "react-native";
import PropTypes from 'prop-types';
import React, {Component} from 'react';
import PathRegistry from './framework/routing/PathRegistry';
import BeanRegistry from './framework/bean/BeanRegistry';
import Realm from 'realm';
import {EntityMetaData, EntityQueue, Schema} from 'avni-models';
import './views';
import AppStore from './store/AppStore';
import EntitySyncStatusService from "./service/EntitySyncStatusService";
import _ from "lodash";
import codePush from "react-native-code-push";
import {RegisterAndScheduleJobs, SetBackgroundTaskDependencies} from "./AvniBackgroundJob";
import ErrorHandler from "./utility/ErrorHandler";

const {Restart} = NativeModules;
let routes, beans, reduxStore, db = undefined;

const initialiseContext = function () {
    db = new Realm(Schema);
    db.objects(EntityQueue.schema.name);
    beans = BeanRegistry.init(db, this);
    reduxStore = AppStore.create(beans);
    beans.forEach(bean => bean.setReduxStore(reduxStore));
};

let error;
try {
    if (db === undefined) {
        initialiseContext();
        routes = PathRegistry.routes();
        const entitySyncStatusService = beans.get(EntitySyncStatusService);
        entitySyncStatusService.setup(EntityMetaData.model());

        SetBackgroundTaskDependencies(db, beans);
    }
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
        this.getBean = this.getBean.bind(this);
        ErrorHandler.set(this.handleError);
        this.state = {error};
    }

    handleError(error, stacktrace) {
        this.setState({error, stacktrace});
    }

    getChildContext = () => ({
        getDB: () => db,
        getService: (serviceName) => {
            return beans.get(serviceName)
        },
        getStore: () => reduxStore,
    });

    renderError() {
        Alert.alert("App will restart now", this.state.error.message,
            [
                {
                    text: "Copy error and Restart",
                    onPress: () => {
                        Clipboard.setString(`${this.state.error.message}\nStacktrace:\n${this.state.stacktrace}`);
                        Restart.restart();
                    }
                }
            ],
            {cancelable: false}
        );
        return <View/>;
    }

    getBean(name) {
        return beans.get(name);
    }

    componentDidMount() {
        console.log("App", "componentDidMount");
    }

    render() {
        if (this.state.error) {
            return this.renderError();
        }
        if (!_.isNil(routes)) {
            return routes
        }
        return (<Text>Something Went Wrong</Text>);
    }
}

let codePushOptions = {checkFrequency: codePush.CheckFrequency.ON_APP_RESUME};

export default codePush(App);
