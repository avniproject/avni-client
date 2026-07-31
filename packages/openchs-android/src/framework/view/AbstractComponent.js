import PropTypes from 'prop-types';
import React, {Component} from "react";
import {ActivityIndicator, Alert, InteractionManager, Keyboard, StyleSheet, Text, TouchableOpacity, View} from "react-native";
import _ from "lodash";
import MessageService from "../../service/MessageService";
import General from "../../utility/General";
import DGS from '../../views/primitives/DynamicGlobalStyles';
import deferPastInteractions from "../../utility/deferPastInteractions";
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
        
        // Initialize screen render start time for analytics (if topLevelStateVariable is set)
        if (!_.isNil(topLevelStateVariable)) {
            this.screenRenderStartTime = screenRenderStart();
        }
        
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
        this.unsubscribe = this.context.getStore().subscribe(this.refreshState.bind(this));
        this.refreshState();
    }

    componentDidMount() {
        // Analytics timing (only for components with topLevelStateVariable)
        if (!_.isNil(this.topLevelStateVariable) && this.screenRenderStartTime) {
            // Send analytics event after all JS interactions complete
            InteractionManager.runAfterInteractions(() => {
                logScreenEvent(this.viewName(), this.screenRenderStartTime);
            });
        }

        // Defer the heavy load past the slide (willMount would freeze it). _loadStarted set only after
        // success, so a throwing load can't flip isDataLoaded() true against the stale reducer slice;
        // forceUpdate() then clears the loader without relying on the dispatch changing state.
        if (_.isFunction(this.loadData)) {
            deferPastInteractions(() => {
                if (this._isUnmounted) return;
                try {
                    this.loadData();
                    this._loadStarted = true;
                } catch (e) {
                    this._loadError = e;
                    General.logError(this.viewName(), e);
                }
                this.forceUpdate();
            });
        }

        // Call subclass hook if defined (Template Method Pattern)
        if (this.onViewDidMount) {
            this.onViewDidMount();
        }
    }

    // Subclasses should override this instead of componentDidMount
    onViewDidMount() {
        // Default: do nothing
        // Subclasses can override without calling super
    }

    // Override to also require loaded state (e.g. `super.isDataLoaded() && !_.isNil(this.state.x)`)
    // when renderLoaded() dereferences it.
    isDataLoaded() {
        return this._loadStarted === true;
    }

    // Bare primitives: this base class must not import a view component (FullScreenLoader → AppHeader
    // → AbstractComponent would be a circular import).
    renderLoading() {
        return (
            <View style={{flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#ffffff'}}>
                <ActivityIndicator size="large"/>
            </View>
        );
    }

    // A loadData() screen defines renderLoaded(); the base gates it behind the loader/error state.
    render() {
        if (_.isFunction(this.loadData)) {
            if (!_.isNil(this._loadError)) return this.renderLoadError();
            if (!this.isDataLoaded()) return this.renderLoading();
        }
        return this.renderLoaded();
    }

    renderLoaded() {
        return null;
    }

    // Shown when loadData() threw. Bare primitives (no view component — see renderLoading).
    renderLoadError() {
        return (
            <View style={{flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#ffffff', padding: 20}}>
                <Text style={{textAlign: 'center', marginBottom: 20}}>{this.I18n.t('screenLoadError')}</Text>
                <TouchableOpacity onPress={() => this.goBack()}>
                    <Text style={{color: '#0000ff', textDecorationLine: 'underline'}}>{this.I18n.t('goBack')}</Text>
                </TouchableOpacity>
            </View>
        );
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
        this._isUnmounted = true;
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
