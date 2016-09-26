import React, {Component} from 'react';
import {ActivityIndicator, StyleSheet, Alert} from 'react-native';
import {Map} from 'immutable';

class AbstractComponent extends Component {
    constructor(props, context) {
        super(props, context);
        this.renderComponent = this.renderComponent.bind(this);
        this.spinnerDefaults = Map({color: 'white', size: 'small'});
        this.showError = this.showError.bind(this);
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
        getStore: React.PropTypes.func
    };

    dispatchAction(action, params) {
        this.context.getStore().dispatch({"type": action, ...params});
    }

    renderComponent(loading, component, color = this.spinnerDefaults.get("color"),
                    size = this.spinnerDefaults.get("size")) {
        if (loading) return (
            <ActivityIndicator style={AbstractComponent.styles.spinner} color={color} size={size}/>);
        return component;
    }

    showError(errorMessage) {
        if (this.state.error) {
            return (Alert.alert(this.I18n.t(errorMessage), this.state.errorMessage,
                [
                    {
                        text: this.I18n.t('ok'), onPress: () => {
                        this.setState({error: false, errorMessage: undefined});
                    }
                    }
                ]
            ));
        }
    }


}

export default AbstractComponent;
