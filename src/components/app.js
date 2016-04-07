import React, {
    Component,
    StyleSheet,
    Text,
    View,
    ListView
} from 'react-native';

import Router from './routing/router.js';
import Route from './routing/route.js';
import diseaseView from './views/diseaseView.js';
import questionAnswerView from './views/questionAnswer.js';

class App extends Component {
    render() {
        return (
            <Router initialRoute={{path: diseaseView.path()}}>
                <Route path={diseaseView.path()} component={diseaseView.component()}/>
                <Route path={questionAnswerView.path()} component={questionAnswerView.component()}/>
            </Router>
        );
    }
}

export default App;