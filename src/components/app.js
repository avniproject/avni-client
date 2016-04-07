import React, {
    Component,
    StyleSheet,
    Text,
    View,
    ListView
} from 'react-native';

import ViewMap from './viewMap.js';

class App extends Component {
    constructor(props) {
        super(props);
        this.viewMap = new ViewMap();
        this.state = {"currentView": this.viewMap.defaultView()};
    }

    _updateView(viewName) {
        this.state.currentView = this.viewMap.get(viewName);
    }

    render() {
        var CurrentView = this.viewMap.get(this.state.currentView);
        return (
            <View>
                <CurrentView updateView={this._updateView}></CurrentView>
            </View>
        );
    }
}

export default App;