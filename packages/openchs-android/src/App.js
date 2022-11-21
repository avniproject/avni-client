import {Alert, Clipboard, NativeModules, Text, View} from 'react-native';
import PropTypes from 'prop-types';
import React, {Component} from 'react';
import PathRegistry from './framework/routing/PathRegistry';
import BeanRegistry from './framework/bean/BeanRegistry';
import Realm from 'realm';
import {EntityMetaData, Schema} from 'avni-models';
import './views';
import AppStore from './store/AppStore';
import EntitySyncStatusService from './service/EntitySyncStatusService';
import _ from 'lodash';
import ErrorHandler from './utility/ErrorHandler';
import FileSystem from './model/FileSystem';
import BackupRestoreRealmService from './service/BackupRestoreRealm';
import GlobalContext from './GlobalContext';

const {Restart} = NativeModules;

let globalContext = new GlobalContext();

const updateDatabase = function (globalContext) {
    globalContext.db.close();
    globalContext.db = new Realm(Schema);
    globalContext.beanRegistry.updateDatabase(globalContext.db);
};

const initialiseContext = function () {
    globalContext.db = new Realm(Schema);
    globalContext.beanRegistry = BeanRegistry;
    BeanRegistry.init(globalContext.db);
    globalContext.reduxStore = AppStore.create(globalContext.beanRegistry.beans);
    globalContext.beanRegistry.setReduxStore(globalContext.reduxStore);

    let restoreRealmService = globalContext.beanRegistry.getService(BackupRestoreRealmService);
    restoreRealmService.subscribeOnRestore(() => updateDatabase(globalContext));
};

let error;
try {
    if (globalContext.db === undefined) {
        initialiseContext();
        globalContext.routes = PathRegistry.routes();
        const entitySyncStatusService = globalContext.beanRegistry.getService(EntitySyncStatusService);
        entitySyncStatusService.setup(EntityMetaData.model());
    }
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
        getDB: () => globalContext.db,
        getService: (serviceName) => {
            return globalContext.beanRegistry.getService(serviceName);
        },
        getStore: () => globalContext.reduxStore,
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
        return globalContext.beanRegistry.getService(name);
    }

    componentDidMount() {
        console.log("App", "componentDidMount");
    }

    render() {
        if (this.state.error) {
            return this.renderError();
        }
        if (!_.isNil(globalContext.routes)) {
            return globalContext.routes
        }
        return (<Text>Something Went Wrong</Text>);
    }
}

export default App;
