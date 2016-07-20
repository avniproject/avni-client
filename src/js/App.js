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

export default class App extends Component {

    constructor(props, context) {
        super(props, context);
        this.store = new Realm(models);
        this.beans = BeanRegistry.init(this.store, this);
        this.getBean = this.getBean.bind(this);
        BootstrapRegistry.runAllTasks(this.getBean);
    }

    static childContextTypes = {
        getService: React.PropTypes.func.isRequired,
        getStore: React.PropTypes.func.isRequired
    };

    getChildContext = () => ({
        getStore: () => this.store,
        getService: (serviceName) => {
            return this.beans.get(serviceName)
        }
    });

    getBean(name) {
        return this.beans.get(name);
    }

    render() {
        require('./service/ConfigurationData');
        return PathRegistry.routes();
    }
}

//TODO - next and previous button should be at the same place on every page