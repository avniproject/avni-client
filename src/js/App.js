import {Dimensions} from "react-native";
import React, {Component} from 'react';
import PathRegistry from './framework/routing/PathRegistry';
import BeanRegistry from './framework/bean/BeanRegistry';
import Realm from 'realm';
import models from './models';
import './views';
import AppStore from './store/AppStore';
import EntitySyncStatusService from "./service/EntitySyncStatusService";
import EntityMetaData from "./models/EntityMetaData";

let routes, beans, reduxStore, db = undefined;

export default class App extends Component {
    constructor(props, context) {
        super(props, context);
        if (db === undefined) {
            db = new Realm(models);
            beans = BeanRegistry.init(db, this);
            reduxStore = AppStore.create(beans);
            routes = PathRegistry.routes();
            const entitySyncStatusService = beans.get(EntitySyncStatusService);
            entitySyncStatusService.setup(EntityMetaData.model());
        }
        this.getBean = this.getBean.bind(this);
        console.log(`DEVICE HEIGHT=${Dimensions.get('window').height} WIDTH=${Dimensions.get('window').width}`);
    }

    static childContextTypes = {
        getService: React.PropTypes.func.isRequired,
        getDB: React.PropTypes.func.isRequired,
        getStore: React.PropTypes.func.isRequired
    };

    getChildContext = () => ({
        getDB: () => db,
        getService: (serviceName) => {
            return beans.get(serviceName)
        },
        getStore: () => reduxStore
    });

    getBean(name) {
        return beans.get(name);
    }

    render() {
        return routes;
    }
}