import PropTypes from 'prop-types';
import React, {Component} from 'react';
import {BackHandler, View} from 'react-native';
import {Navigator} from 'react-native-deprecated-custom-components';
import General from "../../utility/General";

export default class Router extends Component {

    static propTypes = {
        initialRoute: PropTypes.object.isRequired,
    };

    static childContextTypes = {
        navigator: PropTypes.func.isRequired,
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
        this.renderScene = this.renderScene.bind(this);
    }

    getChildContext = () => ({
        navigator: () => this.navigator,
    });

    componentDidMount = () => {
        BackHandler.addEventListener('backPress', () => {
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
        BackHandler.removeEventListener('backPress');
    };

    configureScene(route) {
        if (route.sceneConfig) return route.sceneConfig;

        return Navigator.SceneConfigs.PushFromRight;
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
        const element = route.isTyped ? <Element {...route.queryParams}/> :
            <Element params={route.queryParams}/>;
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
    }

    render() {
        return (
            <Navigator
                onWillFocus={(route) => this.willFocus(route)}
                onDidFocus={(route) => this.didFocus(route)}
                initialRoute={this.props.initialRoute}
                renderScene={this.renderScene}
                configureScene={this.configureScene}
            />
        );
    }
}
