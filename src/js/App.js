import React, {Component} from 'react-native';
import PathRegistry from './routing/PathRegistry';
import BeanRegistry from './framework/BeanRegistry.js';
import Realm from 'realm';
import models from './models';
import './views';
import './service';
import SettingsService from "./service/SettingsService";

export default class App extends Component {
    constructor() {
        super();
        this.store = new Realm(models);
        this.beans = BeanRegistry.init(this.store);
    }

    static childContextTypes = {
        getService: React.PropTypes.func.isRequired,
        getStore: React.PropTypes.func.isRequired
    };

    getChildContext = () => ({
        getStore: () => this.store,
        getService: (serviceName) => this.beans.get(serviceName)
    });

    render() {
        var settingsService = new SettingsService(this.store);
        settingsService.initialise();
        return PathRegistry.routes();
    }
}

//todo - next and previous button should be at the same place on every page