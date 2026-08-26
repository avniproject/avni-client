import PropTypes from 'prop-types';
import React, {Component} from 'react';
import {BackHandler, View} from 'react-native';
import {Navigator} from 'react-native-deprecated-custom-components';
import General from "../../utility/General";
import _ from 'lodash';
import ServiceContext from '../context/ServiceContext';
import SceneFocusRegistry from './SceneFocusRegistry';

export default class Router extends Component {
    static propTypes = {
        initialRoute: PropTypes.object.isRequired,
    };

    onInitialScreen = true;

    constructor(props) {
        super(props);

        const routes = {};
        React.Children.forEach(props.children, (element) => {
            if (React.isValidElement(element)) {
                routes[element.props.path] = element.props.component;
            }
        });
        this.state = {routes};
        this.routeElementMap = {};
        // Focus is published as state, not a bare event: a screen mounted inside a parent's
        // renderLoaded() comes into existence after its scene has already focused, and would otherwise
        // wait out AbstractComponent's fallback timer. See SceneFocusRegistry. (avni-client#2054)
        this.sceneFocus = new SceneFocusRegistry((fn) => requestAnimationFrame(fn));
        this.renderScene = this.renderScene.bind(this);
    }

    // didFocus() below only reaches the route's ROOT component (routeElementMap is keyed by path), so a
    // screen rendered as a child of that root - NewVisitMenuView inside NewVisitPageView, for instance -
    // never hears about it. Views subscribe here instead, at any depth, via ServiceContext.
    subscribeSceneDidFocus = (listener) => this.sceneFocus.subscribe(listener);

    // The path currently transitioning or focused. Lets a subscriber ignore another scene's transition.
    currentRoutePath = () => this.path;

    componentDidMount = () => {
        this.backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
            const element = this.routeElementMap[this.path];
            if (element && element.onHardwareBackPress) {
                return element.onHardwareBackPress();
            }
            if (!this.onInitialScreen) {
                try {
                    this.navigator.pop();
                } catch (e) {
                    General.logErrorAsInfo("Router", e);
                    return false;
                }
                return true;
            }
            return false;
        });
    };

    componentWillUnmount = () => {
        this.backHandler.remove();
    };

    configureScene(route) {
        if (route.sceneConfig) return route.sceneConfig;

        return {
            ...Navigator.SceneConfigs.PushFromRight,
            defaultTransitionVelocity: 15
        };
    }

    renderScene(route, nav) {
        const currentRoutes = nav.getCurrentRoutes();
        General.logDebug("Router", `renderScene: Current Routes: ${currentRoutes.map((x) => x.path)}. Route: ${route.path}`);
        this.navigator = nav;
        this.path = route.path;
        if (!this.state.routes[route.path]) {
            return <View/>;
        }

        if (currentRoutes.length > 1 && currentRoutes[currentRoutes.length - 2].path === route.path && this.elementMap.path === route.path) {
            General.logDebug("Router", `Using cached route: ${route.path}. Element map path: ${this.elementMap.path}`);
            return this.elementMap.element;
        }

        this.onInitialScreen = this.props.initialRoute.path === route.path;
        const Element = this.state.routes[route.path];
        const refCallback = (ref) => {
            if (ref) {
                this.routeElementMap[route.path] = ref;
            } else {
                delete this.routeElementMap[route.path];
            }
        };
        const element = route.isTyped ? <Element {...route.queryParams} ref={refCallback}/> :
            <Element params={route.queryParams} ref={refCallback}/>;
        this.elementMap = {element: element, path: route.path};
        this.willChangeFocus(route);
        return element;
    }

    willChangeFocus(route) {
        const element = this.routeElementMap[route.path];
        if (!_.isNil(element) && _.isFunction(element.changeFocus)) {
            element.changeFocus();
        }
    }

    willFocus(route) {
        // A new transition has begun, so the previous focus must not be replayed to late subscribers.
        this.sceneFocus.markTransitionStarted();
        const element = this.routeElementMap[route.path];
        if (!_.isNil(element) && _.isFunction(element.willFocus)) {
            element.willFocus();
        }
    }

    didFocus(route) {
        const element = this.routeElementMap[route.path];
        if (!_.isNil(element) && _.isFunction(element.didFocus)) {
            element.didFocus();
        }
        this.sceneFocus.markFocused(route);
    }

    render() {
        return (
            <ServiceContext.Consumer>
                {(parentContext) => (
                    <ServiceContext.Provider value={{
                        ...parentContext,
                        navigator: () => this.navigator,
                        subscribeSceneDidFocus: this.subscribeSceneDidFocus,
                        currentRoutePath: this.currentRoutePath
                    }}>
                        <Navigator
                            onWillFocus={(route) => this.willFocus(route)}
                            onDidFocus={(route) => this.didFocus(route)}
                            initialRoute={this.props.initialRoute}
                            renderScene={this.renderScene}
                            configureScene={this.configureScene}
                        />
                    </ServiceContext.Provider>
                )}
            </ServiceContext.Consumer>
        );
    }
}
