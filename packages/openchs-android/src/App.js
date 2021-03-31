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
import ErrorHandler from './utility/ErrorHandler';
import _ from "lodash";
import FileSystem from "./model/FileSystem";
import codePush from "react-native-code-push";
import {removeBackupFile, restore} from "./BackupRestoreRealm";
import fs from 'react-native-fs';
import {RegisterAndScheduleJobs, SetBackgroundTaskDependencies} from "./AvniBackgroundJob";

const {Restart} = NativeModules;
let routes, beans, reduxStore, db = undefined;

const initialiseContext = function () {
    db = new Realm(Schema);
    db.objects(EntityQueue.schema.name);
    beans = BeanRegistry.init(db, this);
    reduxStore = AppStore.create(beans);
    beans.forEach(bean => bean.setReduxStore(reduxStore));
};

if (db === undefined) {
    initialiseContext();
    routes = PathRegistry.routes();
    const entitySyncStatusService = beans.get(EntitySyncStatusService);
    entitySyncStatusService.setup(EntityMetaData.model());

    SetBackgroundTaskDependencies(db, beans);
}

RegisterAndScheduleJobs();

class App extends Component {
    static childContextTypes = {
        getService: PropTypes.func.isRequired,
        getDB: PropTypes.func.isRequired,
        getStore: PropTypes.func.isRequired,
    };

    constructor(props, context) {
        let error;
        super(props, context);

        try {
            new Promise((resolve, _) => resolve(FileSystem.init()))
                .then(() => fs.readDir(FileSystem.getBackupDir()))
                .then((files) => !_.isEmpty(files) && this.confirmForRestore(files[0].path))
                .then(() => {
                    this.handleError = this.handleError.bind(this);
                    ErrorHandler.set(this.handleError);
                    this.setState({loadApp: true});
                });
        } catch (e) {
            error = e
        }
        this.getBean = this.getBean.bind(this);
        this.state = {error};
    }

    async confirmForRestore(filePath) {
        return new Promise((resolve, reject) => {
            Alert.alert(
                'Backup found',
                'Backup file found, want to restore?',
                [
                    {text: 'No', onPress: () => resolve(removeBackupFile(filePath))},
                    {text: 'Yes', onPress: () => resolve(restore(filePath, initialiseContext))}
                ],
                {cancelable: false}
            )
        })
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
        console.log("App", "componentDidMount");
    }

    render() {
        if (this.state.loadApp) {
            if (!_.isNil(this.state.error)) return this.renderError();
            if (!_.isNil(routes)) {
                return routes
            }
            return (<Text>Something Went Wrong</Text>);
        } else {
            return <View/>
        }
    }
}

let codePushOptions = {checkFrequency: codePush.CheckFrequency.ON_APP_RESUME};

export default codePush(App);
