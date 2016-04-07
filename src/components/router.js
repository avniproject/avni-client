import React, {View, Navigator, Component} from 'react-native';

class Router extends Component {

    constructor(props) {
        super(props);

        const routes = {};
        React.Children.forEach(props.children, (element) => {
            if (React.isValidElement(element)) {
                routes[element.props.path] = element.props.component;
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
        console.log(route.path);
        console.log(this.state.routes);
        if (!this.state.routes[route.path]) return <View/>;
        const Element = this.state.routes[route.path];
        return (<Element params={route.queryParams}></Element>);
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