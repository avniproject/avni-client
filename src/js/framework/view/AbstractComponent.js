import React, {Component} from 'react';
import {ActivityIndicator, StyleSheet} from 'react-native';
import {Map} from 'immutable';

class AbstractComponent extends Component {
    constructor(props, context) {
        super(props, context);
        this.renderComponent = this.renderComponent.bind(this);
        this.spinnerDefaults = Map({color: 'white', size: 'small'});
        this.getState = this.getState.bind(this);
        this.unsubscribe = ()=>{};
    }

    static styles = StyleSheet.create({
        spinner: {
            justifyContent: 'center',
            alignSelf: 'center',
        }
    });

    static contextTypes = {
        navigator: React.PropTypes.func.isRequired,
        getService: React.PropTypes.func.isRequired,
        getStore: React.PropTypes.func,
    };

    getState(key) {
        return this.context.getStore().getState()[key];
    }

    subscribe(cb) {
        this.unsubscribe = this.context.getStore().subscribe(cb.bind(this));
    }

    unsubscribe(){
        this.unsubscribe();
    }

    dispatchAction(action, params) {
        this.context.getStore().dispatch({"type": action, ...params});
    }

    renderComponent(loading, component, color = this.spinnerDefaults.get("color"),
                    size = this.spinnerDefaults.get("size")) {
        if (loading) return (
            <ActivityIndicator style={AbstractComponent.styles.spinner} color={color} size={size}/>);
        return component;
    }

}

export default AbstractComponent;
