import {Text, Alert, NativeModules, View, Clipboard} from "react-native";
import PropTypes from 'prop-types';
import React, {Component} from 'react';
import PathRegistry from './framework/routing/PathRegistry';
import BeanRegistry from './framework/bean/BeanRegistry';
import Realm from 'realm';
import {Schema, EntityMetaData} from 'openchs-models';
import './views';
import AppStore from './store/AppStore';
import EntitySyncStatusService from "./service/EntitySyncStatusService";
import ErrorHandler from './utility/ErrorHandler';
import _ from "lodash";
import FileSystem from "./model/FileSystem";
import BackgroundTask from 'react-native-background-task';
import PruneMedia from "./task/PruneMedia";
import codePush from "react-native-code-push";

const {Restart} = NativeModules;
let routes, beans, reduxStore, db = undefined;

console.log(EntityMetaData);

BackgroundTask.define(() => {
    PruneMedia().then(
        () => BackgroundTask.finish(),
        () => BackgroundTask.finish()
    );
});

class App extends Component {
    constructor(props, context) {
        let error; // RNUPGRADE
        super(props, context);

        try {  // RNUPGRADE
            FileSystem.init();
            this.handleError = this.handleError.bind(this);
            ErrorHandler.set(this.handleError);
            if (db === undefined) {
                db = new Realm(Schema);
                beans = BeanRegistry.init(db, this);
                reduxStore = AppStore.create(beans);
                beans.forEach(bean => bean.setReduxStore(reduxStore));
                routes = PathRegistry.routes();
                const entitySyncStatusService = beans.get(EntitySyncStatusService);
                entitySyncStatusService.setup(EntityMetaData.model());
            }
        } catch (e) {
            error = e
        } // RNUPGRADE
        this.getBean = this.getBean.bind(this);
        this.state = {error} // RNUPGRADE
    }

    static childContextTypes = {
        getService: PropTypes.func.isRequired,
        getDB: PropTypes.func.isRequired,
        getStore: PropTypes.func.isRequired,
    };

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
                        Restart.restart()
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
        const SIX_HOURS = 60 * 60 * 6;
        BackgroundTask.schedule({period: SIX_HOURS});
    }

    render() {
        if (!_.isNil(this.state.error)) return this.renderError();
        if (!_.isNil(routes)) return routes;
        return (<Text>Something Went Wrong</Text>);
    }
}

let codePushOptions = { checkFrequency: codePush.CheckFrequency.ON_APP_RESUME };

export default codePush(App);