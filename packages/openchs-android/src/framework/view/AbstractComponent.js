import PropTypes from 'prop-types';
import React, {Component, Text, View} from "react";
import {Alert, StyleSheet, Keyboard, InteractionManager} from "react-native";
import _ from "lodash";
import MessageService from "../../service/MessageService";
import General from "../../utility/General";
import DGS from '../../views/primitives/DynamicGlobalStyles';
import TypedTransition from "../routing/TypedTransition";
import {logScreenEvent, screenRenderStart} from "../../utility/Analytics";
import {JSONStringify} from "../../utility/JsonStringify";
import ServiceContext from "../context/ServiceContext";

class AbstractComponent extends Component {
    static contextType = ServiceContext;
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
        this.scrollToTop = this.scrollToTop.bind(this);
        this.scrollToPosition = this.scrollToPosition.bind(this);
        this.scrollToBottom = this.scrollToBottom.bind(this);
        
        // Warn if subclass (not AbstractComponent itself) overrides componentDidMount
        if (this.constructor !== AbstractComponent && 
            this.constructor.prototype.hasOwnProperty('componentDidMount')) {
            General.logWarn(
                'AbstractComponent',
                `${this.constructor.name} overrides componentDidMount(). Use onViewDidMount() instead.`
            );
        }
    }

    getService(Class) {
        return this.context.getService(Class);
    }

    // Lazy getter for I18n - initializes on first access
    get I18n() {
        if (!this._i18n) {
            this._i18n = this.context.getService(MessageService).getI18n();
        }
        return this._i18n;
    }

    changeFocus() {
    }

    willFocus() {
    }

    didFocus() {
    }

    dispatchAction(action, params) {
        const type = action instanceof Function ? action.Id : action;
        if (General.canLog(General.LogLevel.Debug)) {
            General.logDebug(`${this.constructor.name}::AC`, `Dispatching action: ${JSON.stringify(type)}`);
        }
        const dispatchResult = this.context.getStore().dispatch({type, ...params});
        if (General.canLog(General.LogLevel.Debug)) {
            const nextState = this.getContextState(this.topLevelStateVariable);
            General.logDebug(`${this.constructor.name}::AC`, `Dispatched action completed: ${JSON.stringify(type)} ${JSONStringify(nextState)}`);
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
        this.screenRenderStartTime = screenRenderStart();
        const screenName = this.viewName();
        General.logDebug('Analytics', `Screen render started: ${screenName} at ${this.screenRenderStartTime}`);
        this.unsubscribe = this.context.getStore().subscribe(this.refreshState.bind(this));
        this.refreshState();
    }

    componentDidMount() {
        // Analytics timing (only for components with topLevelStateVariable)
        if (!_.isNil(this.topLevelStateVariable) && this.screenRenderStartTime) {
            const screenName = this.viewName();
            
            // Log UI render completion (after layout)
            requestAnimationFrame(() => {
                const uiRenderTime = Date.now() - this.screenRenderStartTime;
                General.logDebug('Analytics', `Screen UI render completed: ${screenName}, time: ${uiRenderTime}ms`);
            });
            
            // Log JS interactions completion and send to Firebase
            // This represents when all processing is done and screen is fully ready
            InteractionManager.runAfterInteractions(() => {
                const interactionTime = Date.now() - this.screenRenderStartTime;
                General.logDebug('Analytics', `Screen JS interactions completed: ${screenName}, time: ${interactionTime}ms`);
                logScreenEvent(screenName, this.screenRenderStartTime);
            });
        }
        
        // Call subclass hook if defined (Template Method Pattern)
        // This runs for ALL components, not just those with analytics
        if (this.onViewDidMount) {
            this.onViewDidMount();
        }
    }
    
    // Subclasses should override this instead of componentDidMount
    onViewDidMount() {
        // Default: do nothing
        // Subclasses can override without calling super
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
        if (this.scrollRef) {
            this.scrollRef.current?.scrollTo({x: 0, y: 10, animated: true});
            this.scrollRef.current?.scrollTo({x: 0, y: 1, animated: true});
        }
    }

    scrollToBottom() {
        if (this.scrollRef) {
            this.scrollRef.current?.scrollToEnd({ animated: true });
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
