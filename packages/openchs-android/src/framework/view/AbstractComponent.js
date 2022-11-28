import PropTypes from 'prop-types';
import React, {Component, Text, View} from "react";
import {Alert, StyleSheet, Keyboard} from "react-native";
import _ from "lodash";
import MessageService from "../../service/MessageService";
import General from "../../utility/General";
import DGS from '../../views/primitives/DynamicGlobalStyles';
import TypedTransition from "../routing/TypedTransition";
import {logScreenEvent} from "../../utility/Analytics";
import moment from "moment";

class AbstractComponent extends Component {
    static contextTypes = {
        navigator: PropTypes.func.isRequired,
        getService: PropTypes.func.isRequired,
        getStore: PropTypes.func
    };
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

    constructor(props, context, topLevelStateVariable) {
        super(props, context);
        this.topLevelStateVariable = topLevelStateVariable;
        this.I18n = context.getService(MessageService).getI18n();
        this.scrollToTop = this.scrollToTop.bind(this);
        this.scrollToPosition = this.scrollToPosition.bind(this);
    }

    getService(Class) {
        return this.context.getService(Class);
    }

    changeFocus() {
    }

    willFocus() {
    }

    didFocus() {
    }

    componentDidUpdate() {
        // General.logDebug((this.viewName ? this.viewName() : this.constructor.name), "DID UPDATE");
    }

    dispatchAction(action, params) {
        const type = action instanceof Function ? action.Id : action;
        if (General.canLog(General.LogLevel.Debug)) {
            General.logDebug(`${this.constructor.name}::AbstractComponent`, `Dispatching action: ${JSON.stringify(type)}`);
        }
        const dispatchResult = this.context.getStore().dispatch({type, ...params});
        if (General.canLog(General.LogLevel.Debug)) {
            General.logDebug(`${this.constructor.name}::AbstractComponent`, `Dispatched action completed: ${JSON.stringify(type)}`);
        }
        return dispatchResult;
    }

    async dispatchAsyncAction(action, params) {
        return await this.dispatchAction(action, params);
    }

    dispatchFn(fn) {
        return this.context.getStore().dispatch(fn);
    }

    getContextState(param) {
        return this.context.getStore().getState()[param];
    }

    showError(message) {
        Alert.alert(this.I18n.t("validationError"), message,
            [
                {
                    text: this.I18n.t('ok'), onPress: () => {
                    }
                },
            ]
        );
    }

    UNSAFE_componentWillMount() {
        if (_.isNil(this.topLevelStateVariable)) return;
        this.unsubscribe = this.context.getStore().subscribe(this.refreshState.bind(this));
        this.refreshState();
        logScreenEvent(this.viewName())
    }

    refreshState() {
        const nextState = this.getContextState(this.topLevelStateVariable);
        if (!General.objectsShallowEquals(nextState, this.state)) {
            if (!_.isNil(nextState.error))
                this.showError(nextState.error.message);
            this.setState(nextState);
        }
    }

    scrollToTop() {
        if (this.scrollRef.current) {
            this.scrollRef.current?.scrollTo({x: 0, y: 10, animated: true});
            this.scrollRef.current?.scrollTo({x: 0, y: 1, animated: true});
        }
    }

    scrollToPosition(x, y) {
        if (this.scrollRef) {
            this.scrollRef.current?.scrollTo({x, y, animated: true});
        }
    }

    componentWillUnmount() {
        if (_.isNil(this.topLevelStateVariable)) return;
        this.unsubscribe();
    }

    appendedStyle(style) {
        const appendedStyle = _.assign({}, _.isNil(style) ? {} : style, this.props.style);
        return this.scaleStyle(appendedStyle);
    }

    scaleStyle(styles) {
        const resizeStylesFn = (filterList, resizeFn) => (value, key) => {
                return _.find(filterList, (name) => name === key) ? resizeFn.call(DGS, value) : value
            },
            resizeHorizontalStylesFn = resizeStylesFn(DGS.stylesForHorizontalDistances, DGS.resizeWidth),
            resizeVerticalStylesFn = resizeStylesFn(DGS.stylesForVerticalDistances, DGS.resizeHeight);

        return _.chain(styles)
            .mapValues(resizeHorizontalStylesFn)
            .mapValues(resizeVerticalStylesFn)
            .value();
    }

    goBack() {
        TypedTransition.from(this).goBack();
    }

    handleError({syncRequiredError}) {
        if (syncRequiredError) {
            Alert.alert(this.I18n.t("syncRequired"), this.I18n.t(syncRequiredError), [
                {text: this.I18n.t('okay'), onPress: _.noop}
            ]);
        }
    }

    viewName() {
        return this.constructor.name;
    }

    dismissKeyboard() {
        Keyboard.dismiss();
    }
}

export default AbstractComponent;
