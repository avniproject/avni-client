import React, {Component} from 'react';
import {View, Navigator, BackAndroid} from 'react-native';

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

        this.renderScene = this.renderScene.bind(this);
    }

    getChildContext = () => ({
        navigator: () => this.navigator,
    });

    componentDidMount = () => {
        BackAndroid.addEventListener('hardwareBackPress', () => {
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
        if (!this.state.routes[route.path]) return <View/>;

        this.onInitialScreen = this.props.initialRoute.path === route.path;
        const Element = this.state.routes[route.path];
        return (
            <Element params={route.queryParams}/>
        );
    }

    render() {
        return (
            <Navigator
                initialRoute={this.props.initialRoute}
                renderScene={this.renderScene}
                configureScene={this.configureScene}
            />
        );
    }
}
