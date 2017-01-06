import React, {Component, View, Text} from 'react';
import {ActivityIndicator, StyleSheet, Alert} from 'react-native';
import {Map} from 'immutable';
import _ from "lodash";
import MessageService from "../../service/MessageService";

class AbstractComponent extends Component {
    static contextTypes = {
        navigator: React.PropTypes.func.isRequired,
        getService: React.PropTypes.func.isRequired,
        getStore: React.PropTypes.func
    };

    constructor(props, context, topLevelStateVariable) {
        super(props, context);
        this.renderComponent = this.renderComponent.bind(this);
        this.spinnerDefaults = Map({color: 'white', size: 'small'});
        this.showError = this.showError.bind(this);
        this.topLevelStateVariable = topLevelStateVariable;
        this.I18n = context.getService(MessageService).getI18n();
    }

    static styles = StyleSheet.create({
        spinner: {
            justifyContent: 'center',
            alignSelf: 'center',
        },
        listRowSeparator: {
            height: 2,
            backgroundColor: '#14e4d5'
        },
    });

    dispatchAction(action, params) {
        this.context.getStore().dispatch({"type": action, ...params});
    }

    getContextState(param) {
        return this.context.getStore().getState()[param];
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

    static _renderSeparator(rowNumber, rowID, total) {
        if (rowNumber === (total - 1) || rowNumber === `${(total - 1)}` || total === 0 || total === undefined) {
            return (<View key={rowID}/>);
        }
        return (<Text key={rowID} style={AbstractComponent.styles.listRowSeparator}/>);
    }

    componentWillMount() {
        if (_.isNil(this.topLevelStateVariable)) return;
        this.unsubscribe = this.context.getStore().subscribe(this.refreshState.bind(this));
        this.refreshState();
    }

    refreshState() {
        this.setState(this.getContextState(this.topLevelStateVariable));
    }

    componentWillUnmount() {
        if (_.isNil(this.topLevelStateVariable)) return;
        this.unsubscribe();
    }
}

export default AbstractComponent;
