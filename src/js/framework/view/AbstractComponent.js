import React, {Component} from 'react';
import {ActivityIndicator} from 'react-native';
import {Map} from 'immutable';

class AbstractComponent extends Component {
    constructor(props, context) {
        super(props, context);
        this.renderSpinner = this.renderSpinner.bind(this);
    }

    static contextTypes = {
        navigator: React.PropTypes.func.isRequired,
        getService: React.PropTypes.func.isRequired,
        getStore: React.PropTypes.func
    };

    dispatchAction(action) {
        this.context.getStore().dispatch({"type": action});
    }

    renderSpinner(component) {
        if (this.props.loading) return (<ActivityIndicator color="white" />);
        return component;
    }

}

export default AbstractComponent;
