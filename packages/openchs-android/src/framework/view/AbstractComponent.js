import PropTypes from 'prop-types';
import React, {Component} from "react";
import {ActivityIndicator, Alert, InteractionManager, Keyboard, StyleSheet, Text, TouchableOpacity, View} from "react-native";
import _ from "lodash";
import MessageService from "../../service/MessageService";
import General from "../../utility/General";
import Perf from "../../utility/perf";
import DGS from '../../views/primitives/DynamicGlobalStyles';
import deferPastInteractions from "../../utility/deferPastInteractions";
import TypedTransition from "../routing/TypedTransition";
import {logScreenEvent, screenRenderStart} from "../../utility/Analytics";
import {JSONStringify} from "../../utility/JsonStringify";
import ServiceContext from "../context/ServiceContext";

class AbstractComponent extends Component {
    static contextType = ServiceContext;
    // Safety net if a route never reports focus. Comfortably longer than a scene transition, so in the
    // normal case the focus signal always wins and this never fires.
    static LOAD_FALLBACK_MS = 1500;
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
        this.scrollToStaticFieldError = this.scrollToStaticFieldError.bind(this);
        
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

        // Start the heavy load only once the scene transition has actually finished painting.
        // InteractionManager settles earlier than the slide's last frame, and starting a multi-second
        // synchronous block there starves the spring mid-flight, leaving the OUTGOING screen on
        // screen under the new header (avni-client#2054, device QA 25 Aug: block began at +483 ms,
        // first render at +4.15 s). Router publishes the transition-complete signal through
        // ServiceContext so children at any depth hear it, not just the route's root component.
        // The timer is the safety net for a route that never reports focus, and deferPastInteractions
        // covers components mounted outside the Router entirely.
        if (_.isFunction(this.loadData)) {
            this.runAfterSceneTransition(() => this.runDeferredLoad());
        }

        // Call subclass hook if defined (Template Method Pattern)
        if (this.onViewDidMount) {
            this.onViewDidMount();
        }
    }

    // Runs `fn` once, after the scene transition has been PAINTED. Public so screens that schedule their
    // own work instead of using the loadData() contract (ProgramActionsView) get the same trigger.
    //
    // Waiting for didFocus alone is not enough: it means "the transition animation finished", not "the
    // result is on screen". The slide is JS-driven, so its final position and this screen's loader both
    // still need one more commit pushed from JS. Measured 25 Aug: didFocus at +513ms, the blocking load
    // started 7ms later, and the last frame the UI thread ever painted was mid-slide — which is exactly
    // the split screen reported in avni-client#2054. The double rAF lets that commit land first.
    runAfterSceneTransition(fn) {
        // Per-registration state, NOT instance fields: a component may call this more than once
        // (SubjectDashboardProgramsTab registers loadData() via the base class AND dispatchOnLoad() from
        // onViewDidMount). Sharing a single _fired flag made the second registration a silent no-op, and
        // sharing a single unsubscribe slot leaked the first listener into the Router for the app's
        // lifetime. Each call now owns its own flag, listener and timer. (avni-client#2054)
        const subscribeSceneDidFocus = _.get(this.context, 'subscribeSceneDidFocus');
        const armedAt = Date.now();
        Perf.mark("sceneTrigger.armed", {view: this.viewName(), wired: _.isFunction(subscribeSceneDidFocus)});

        const reg = {fired: false, unsubscribe: null, timer: null};
        this._sceneTransitionRegistrations = this._sceneTransitionRegistrations || [];
        this._sceneTransitionRegistrations.push(reg);

        const release = () => {
            if (reg.timer) {
                clearTimeout(reg.timer);
                reg.timer = null;
            }
            if (_.isFunction(reg.unsubscribe)) {
                reg.unsubscribe();
                reg.unsubscribe = null;
            }
        };

        const fire = (source) => {
            if (this._isUnmounted || reg.fired) return;
            reg.fired = true;
            release();
            requestAnimationFrame(() => requestAnimationFrame(() => {
                if (this._isUnmounted) return;
                Perf.mark("sceneTrigger.fired", {view: this.viewName(), source, sinceArmedMs: Date.now() - armedAt});
                fn();
            }));
        };

        if (_.isFunction(subscribeSceneDidFocus)) {
            reg.unsubscribe = subscribeSceneDidFocus(() => fire("didFocus"));
            reg.timer = setTimeout(() => fire("timer"), AbstractComponent.LOAD_FALLBACK_MS);
        } else {
            // Mounted outside the Router — no scene to wait for.
            deferPastInteractions(() => fire("interactions"));
        }
        reg.release = release;
    }

    // Idempotent: whichever trigger arrives first wins, the rest no-op. _loadStarted is set only after
    // a successful load, so a throwing load can't flip isDataLoaded() true against the stale reducer
    // slice; forceUpdate() then clears the loader without relying on the dispatch changing state.
    runDeferredLoad() {
        if (this._isUnmounted || this._loadStarted || !_.isNil(this._loadError)) return;
        if (!_.isFunction(this.loadData)) return;
        this.clearDeferredLoadTriggers();
        try {
            this.loadData();
            this._loadStarted = true;
        } catch (e) {
            this._loadError = e;
            General.logError(this.viewName(), e);
        }
        if (this._isUnmounted) return;   // loadData() can dispatch a reducer that navigates away
        this.forceUpdate();
    }

    clearDeferredLoadTriggers() {
        _.forEach(this._sceneTransitionRegistrations || [], (reg) => {
            if (_.isFunction(reg.release)) reg.release();
        });
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
            // #2054 diagnostic: names the store-driven re-renders, e.g. the repeated
            // SystemRecommendationView renders after a Summary press.
            Perf.mark("refreshState.setState", {view: this.viewName()});
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

    // Static fields (visit date, GPS) render above the FormElementGroup, outside its scroll-to-error wrapping.
    scrollToStaticFieldError(state) {
        if (state.hasStaticFieldError()) {
            this.scrollToTop();
        }
    }

    componentWillUnmount() {
        this._isUnmounted = true;
        this.clearDeferredLoadTriggers();   // before the early return below — a leaked scene listener
                                            // would keep a dead component reachable from the Router
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
