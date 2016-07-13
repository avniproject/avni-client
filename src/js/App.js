import React, {Component} from 'react';
import PathRegistry from './framework/routing/PathRegistry';
import BeanRegistry from './framework/bean/BeanRegistry.js';
import Realm from 'realm';
import models from './models';
import './views';
import './service';
import AppState from './hack/AppState'; //Required Import

export default class App extends Component {
    constructor() {
        super();
        this.store = new Realm(models);
        this.beans = BeanRegistry.init(this.store, this);
    }

    static childContextTypes = {
        getService: React.PropTypes.func.isRequired,
        getStore: React.PropTypes.func.isRequired
    };

    getChildContext = () => ({
        getStore: () => this.store,
        getService: (serviceName) => {
            console.log(serviceName);
            console.log(Array.from(this.beans.keys()));
            return this.beans.get(serviceName)
        }
    });

    getBean(name) {
        return this.beans.get(name);
    }

    render() {
        const ConceptData = require('./service/ConceptData');
        require('./service/ConfigurationData');
        return PathRegistry.routes();
    }
}

//TODO - next and previous button should be at the same place on every page