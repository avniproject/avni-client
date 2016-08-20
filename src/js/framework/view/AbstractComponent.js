import React, {Component} from 'react';
import {ActivityIndicator, StyleSheet} from 'react-native';
import {Map} from 'immutable';

class AbstractComponent extends Component {
    constructor(props, context) {
        super(props, context);
        this.renderSpinner = this.renderSpinner.bind(this);
    }

    static styles = StyleSheet.create({
        spinner: {
            justifyContent: 'center',
            alignSelf: 'center'
        }
    });

    static contextTypes = {
        navigator: React.PropTypes.func.isRequired,
        getService: React.PropTypes.func.isRequired,
        getStore: React.PropTypes.func
    };

    dispatchAction(action) {
        this.context.getStore().dispatch({"type": action});
    }

    renderSpinner(component, color = "white", size = "small") {
        if (this.props.loading) return (
            <ActivityIndicator style={AbstractComponent.styles.spinner} color={color} size={size}/>);
        return component;
    }

}

export default AbstractComponent;
