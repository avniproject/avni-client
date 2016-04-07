import React, {View, Navigator, Component} from 'react-native';

class Router extends Component {

    constructor(props) {
        super(props);

        const routes = {};
        React.Children.forEach(props.children, function (element) {
            if (React.isValidElement(element)) {
                routes[element.props.path] = element;
            }
        });
        this.state = {routes};
    }

    getChildContext() {
        function getNavigator() {
            return this.navigator;
        }

        return {navigator: getNavigator.bind(this)};
    }

    configureScene(route) {
        if (route.sceneConfig) {
            return route.sceneConfig;
        }
        return Navigator.SceneConfigs.FloatFromRight;
    }

    renderScene(route, nav) {
        this.navigator = nav;
        if (!this.state.routes[route.path]) return <View/>;

        const Element = this.state.routes[route.path];
        return (<Element params={...route.queryParams}></Element>);
    }


    render() {
        return (
            <Navigator
                initialRoute={this.props.initialRoute}
                renderScene={this.renderScene.bind(this)}
                configureScene={this.configureScene}/>
        );
    }
}

Router.childContextTypes = {
    navigator: React.PropTypes.func.isRequired
};

export default Router;