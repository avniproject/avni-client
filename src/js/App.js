import React, {Component} from 'react';
import PathRegistry from './framework/routing/PathRegistry';
import BeanRegistry from './framework/bean/BeanRegistry';
import BootstrapRegistry from './framework/bootstrap/BootstrapRegistry';
import Realm from 'realm';
import models from './models';
import './views';
import './service';
import './tasks';
import AppState from './hack/AppState'; //Required Import
import AppStoreFactory from './store/AppStore';
import {Provider} from 'react-redux'

export default class App extends Component {

    constructor(props, context) {
        super(props, context);
        this.db = new Realm(models);
        this.beans = BeanRegistry.init(this.db, this);
        this.getBean = this.getBean.bind(this);
        this.appStore = AppStoreFactory(this.beans);
        BootstrapRegistry.init(this.appStore.dispatch);
        BootstrapRegistry.runAllTasks();
        this.routes = PathRegistry.routes();
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