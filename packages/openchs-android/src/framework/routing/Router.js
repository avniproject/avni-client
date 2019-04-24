import React, {Component} from 'react';
import {BackAndroid, Navigator, View} from 'react-native';
import General from "../../utility/General";
// import {Navigator} from 'react-native-deprecated-custom-components';

export default class Router extends Component {

    static propTypes = {
        initialRoute: React.PropTypes.object.isRequired,
    };

    static childContextTypes = {
        navigator: React.PropTypes.func.isRequired,
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
        BackAndroid.addEventListener('hardwareBackPress', () => {
            const element = this.routeElementMap[this.path];
            if( element && element.onHardwareBackPress) {
                return element.onHardwareBackPress();
            }
            if (!this.onInitialScreen) {
                this.navigator.pop();
                return true;
            }
            return false;
        });
    };

    componentWillUnmount = () => {
        BackAndroid.removeEventListener('hardwareBackPress');
    };

    configureScene(route) {
        if (route.sceneConfig) return route.sceneConfig;

        return Navigator.SceneConfigs.FloatFromRight;
    }

    renderScene(route, nav) {
        this.navigator = nav;
        this.path = route.path;
        if (!this.state.routes[route.path]) return <View/>;

        this.onInitialScreen = this.props.initialRoute.path === route.path;
        const Element = this.state.routes[route.path];
        const element = route.isTyped ? <Element {...route.queryParams} ref={(child) => {this.routeElementMap[route.path] = child;}}/> :
            <Element ref={(child) => {this.routeElementMap[route.path] = child;}} params={route.queryParams}/>;
        this.willChangeFocus(route);
        return element;
    }

    willChangeFocus(route){
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
        // General.logDebug('Navigator.paths', JSON.stringify(_.map(_.invoke(this.navigator,'getCurrentRoutes'), 'path'),null,2));
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
