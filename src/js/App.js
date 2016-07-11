import React, {Component} from 'react';
import PathRegistry from './routing/PathRegistry';
import BeanRegistry from './framework/BeanRegistry.js';
import Realm from 'realm';
import models from './models';
import './views';
import './service';
import SettingsService from "./service/SettingsService";
import AppState from './hack/AppState';

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
        getService: (serviceName) => this.beans.get(serviceName)
    });

    getBean(name) {
        return this.beans.get(name);
    }

    render() {
        var settingsService = new SettingsService(this.store);
        settingsService.initialise();

        const ConceptData = require('./service/ConceptData');
        require('./service/ConfigurationData');
        return PathRegistry.routes();
    }
}

//todo - next and previous button should be at the same place on every page