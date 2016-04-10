import React, {
    Component,
    StyleSheet,
    Text,
    View,
    ListView
} from 'react-native';

import PathRegistry from './routing/pathRegistry.js';
import * as views from './views/views.js';

class App extends Component {
    render() {
        return PathRegistry.routes();
    }
}

export default App;