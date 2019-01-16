import {Alert, NativeModules, View, Clipboard} from "react-native";
import React, {Component} from 'react';
import PathRegistry from './framework/routing/PathRegistry';
import BeanRegistry from './framework/bean/BeanRegistry';
import Realm from 'realm';
import {Schema, EntityMetaData} from "openchs-models";
import './views';
import AppStore from './store/AppStore';
import EntitySyncStatusService from "./service/EntitySyncStatusService";
import ErrorHandler from './utility/ErrorHandler';
import _ from "lodash";
import FileSystem from "./model/FileSystem";

const {Restart} = NativeModules;
let routes, beans, reduxStore, db = undefined;

export default class App extends Component {
    constructor(props, context) {
        super(props, context);
        FileSystem.init();
        this.handleError = this.handleError.bind(this);
        ErrorHandler.set(this.handleError);
        if (db === undefined) {
            db = new Realm(Schema);
            beans = BeanRegistry.init(db, this);
            reduxStore = AppStore.create(beans, this.handleError);
            routes = PathRegistry.routes();
            const entitySyncStatusService = beans.get(EntitySyncStatusService);
            entitySyncStatusService.setup(EntityMetaData.model());
        }
        this.getBean = this.getBean.bind(this);
        this.state = {error: null}
    }

    static childContextTypes = {
        getService: React.PropTypes.func.isRequired,
        getDB: React.PropTypes.func.isRequired,
        getStore: React.PropTypes.func.isRequired,
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
                {text: "Copy error and Restart",
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

    render() {
        if (!_.isNil(this.state.error)) {
            return this.renderError();
        } else {
            return routes;
        }
    }
}
