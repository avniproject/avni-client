import React, {
    Component,
    StyleSheet,
    Text,
    View,
    ListView
} from 'react-native';

import Router from './router.js';
import Route from './route.js';
import diseaseView from './diseaseView.js';

class App extends Component {
    render() {
        return (
            <Router initialRoute={{path: diseaseView.path()}}>
                <Route path={diseaseView.path()} component={diseaseView.component()}/>
            </Router>
        );
    }
}

export default App;