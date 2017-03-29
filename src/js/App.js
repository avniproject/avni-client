import {Dimensions} from "react-native";
import React, {Component} from 'react';
import PathRegistry from './framework/routing/PathRegistry';
import BeanRegistry from './framework/bean/BeanRegistry';
import Realm from 'realm';
import models from './models';
import './views';
import './service';
import AppStoreFactory from './store/AppStore';
import EntitySyncStatusService from "./service/EntitySyncStatusService";
import EntityMetaData from "./models/EntityMetaData";

export default class App extends Component {
    constructor(props, context) {
        super(props, context);
        this.db = new Realm(models);
        this.beans = BeanRegistry.init(this.db, this);
        this.getBean = this.getBean.bind(this);
        this.appStore = AppStoreFactory(this.beans);
        this.routes = PathRegistry.routes();

        const entitySyncStatusService = this.beans.get(EntitySyncStatusService);
        entitySyncStatusService.setup(EntityMetaData.model());
        console.ignoredYellowBox = ['Warning: Each child in an array or iterator should have a unique "key" prop.'];

        console.log(`DEVICE HEIGHT=${Dimensions.get('window').height} WIDTH=${Dimensions.get('window').width}`);
    }

    static childContextTypes = {
        getService: React.PropTypes.func.isRequired,
        getDB: React.PropTypes.func.isRequired,
        getStore: React.PropTypes.func.isRequired
    };

    getChildContext = () => ({
        getDB: () => this.db,
        getService: (serviceName) => {
            return this.beans.get(serviceName)
        },
        getStore: () => this.appStore
    });

    getBean(name) {
        return this.beans.get(name);
    }

    render() {
        return this.routes;
    }
}