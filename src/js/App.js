import React, { Component } from 'react-native';
import PathRegistry from './routing/PathRegistry';
import BeanRegistry from './framework/BeanRegistry.js';
import Realm from 'realm';
import models from './models';
import './views';
import './service';

export default class App extends Component {

    constructor() {
        super();
        this.store = new Realm(models);
        this.beans = BeanRegistry.init(this.store);
    }

    static childContextTypes = {
        getService: React.PropTypes.func.isRequired,
    };

    getChildContext = () => ({
        getService: (serviceName) => this.beans.get(serviceName),
    });

    render() {
        return PathRegistry.routes();
    }

}
